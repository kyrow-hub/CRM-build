// Supabase Edge Function: receive-sms
//
// Webhook endpoint for Twilio's inbound SMS delivery. When a reply arrives
// at your Twilio number, Twilio POSTs form-encoded data here. This verifies
// the request really came from Twilio (Twilio signs webhooks with
// X-Twilio-Signature, an HMAC-SHA1 over the exact webhook URL plus the
// sorted POST parameters), tries to match the sender's phone number to an
// existing client or client relationship (parent/guardian etc.), and logs
// the message to public.client_sms.
//
// Deploy with: supabase functions deploy receive-sms --no-verify-jwt
// Required secrets: TWILIO_AUTH_TOKEN, SUPABASE_SERVICE_ROLE_KEY
//
// --no-verify-jwt is required because Twilio calls this endpoint directly,
// not as a logged-in CRM user - there is no Supabase auth token to check.
// Authenticity instead comes entirely from the Twilio signature below,
// which is why verifying it correctly matters.
//
// This function necessarily uses the service-role key (unlike send-sms,
// which forwards the caller's own token) because there is no user session
// to act as - Twilio is not a signed-in member of staff. The service-role
// key bypasses Row Level Security entirely, so this function must only
// ever insert the exact fields below and must not be extended to do
// anything else without careful review.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

// See https://www.twilio.com/docs/usage/webhooks/webhooks-security - the
// signature is an HMAC-SHA1 (base64-encoded) of the full webhook URL with
// every POST parameter's name+value appended, sorted alphabetically by
// parameter name, using the Auth Token as the HMAC key.
async function verifyTwilioSignature(
  url: string,
  params: URLSearchParams,
  authToken: string,
  signature: string | null,
): Promise<boolean> {
  if (!signature) return false

  const sortedKeys = Array.from(new Set(params.keys())).sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + params.get(key)
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const expectedSignature = bytesToBase64(new Uint8Array(signatureBytes))

  return expectedSignature === signature
}

// Stored phone numbers are free-text (staff-entered, various formats).
// Normalises to the last 9 digits (an AU mobile number without country
// code or leading 0) so "+61412345678", "0412 345 678", and "412345678"
// all compare equal.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.slice(-9)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!TWILIO_AUTH_TOKEN || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      { error: 'Inbound SMS is not configured. Set TWILIO_AUTH_TOKEN and SUPABASE_SERVICE_ROLE_KEY as function secrets.' },
      500,
    )
  }

  const rawBody = await req.text()
  const params = new URLSearchParams(rawBody)

  const verified = await verifyTwilioSignature(req.url, params, TWILIO_AUTH_TOKEN, req.headers.get('X-Twilio-Signature'))
  if (!verified) {
    return jsonResponse({ error: 'Signature verification failed' }, 401)
  }

  const fromNumber = params.get('From') ?? ''
  const toNumber = params.get('To') ?? ''
  const body = params.get('Body') ?? ''
  const messageSid = params.get('MessageSid')

  if (!fromNumber) {
    return jsonResponse({ error: 'Missing From number in payload' }, 400)
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
  const normalizedFrom = normalizePhone(fromNumber)

  let clientId: string | null = null
  let relationshipId: string | null = null

  const { data: clients } = await supabase.from('clients').select('id, phone').not('phone', 'is', null)
  const matchedClient = (clients ?? []).find((c) => c.phone && normalizePhone(c.phone) === normalizedFrom)
  if (matchedClient) {
    clientId = matchedClient.id
  } else {
    const { data: relationships } = await supabase
      .from('client_relationships')
      .select('id, client_id, phone')
      .not('phone', 'is', null)
    const matchedRelationship = (relationships ?? []).find(
      (r) => r.phone && normalizePhone(r.phone) === normalizedFrom,
    )
    if (matchedRelationship) {
      clientId = matchedRelationship.client_id
      relationshipId = matchedRelationship.id
    }
  }

  const { data: logRow, error: logError } = await supabase
    .from('client_sms')
    .insert({
      client_id: clientId,
      relationship_id: relationshipId,
      direction: 'inbound',
      from_number: fromNumber,
      to_number: toNumber,
      body,
      status: 'received',
      provider_message_id: messageSid,
      read: false,
    })
    .select()
    .single()

  if (logError) {
    return jsonResponse({ error: `Failed to log inbound SMS: ${logError.message}` }, 500)
  }

  // Twilio expects an empty (or TwiML) 200 response to acknowledge receipt
  // without sending an automatic reply back to the sender.
  return new Response('<Response></Response>', { status: 200, headers: { 'Content-Type': 'text/xml' } })
})
