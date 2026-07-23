// Supabase Edge Function: receive-sms
//
// Webhook endpoint for SMS Everyone's inbound reply delivery. SMS Everyone
// (smseveryone.com.au) doesn't document a cryptographic webhook signature
// the way Twilio/Resend do - their own instructions are simply "respond
// with a bare 0 (zero), no HTML, no JSON" to acknowledge a ping. Since
// there's no signature to verify, authenticity instead comes from a shared
// secret token embedded in the webhook URL you give them (see
// SMSEVERYONE_WEBHOOK_TOKEN below) - give SMS Everyone the URL including
// that token as a query param, and never publish the URL anywhere else.
//
// Deploy with: supabase functions deploy receive-sms --no-verify-jwt
// Required secrets: SMSEVERYONE_WEBHOOK_TOKEN, SUPABASE_SERVICE_ROLE_KEY
//
// --no-verify-jwt is required because SMS Everyone calls this endpoint
// directly, not as a logged-in CRM user - there is no Supabase auth token
// for it to send.
//
// This function necessarily uses the service-role key (unlike send-sms,
// which forwards the caller's own token) because there is no user session
// to act as. The service-role key bypasses Row Level Security entirely, so
// this function must only ever insert the exact fields below and must not
// be extended to do anything else without careful review.
//
// IMPORTANT - field names are best-effort, not confirmed: SMS Everyone's
// public docs don't show a raw example inbound payload. The extraction
// below tries several likely field-name candidates (informed by their
// documented /replies polling response shape - Received/Originator/
// Recipient/MessageText - since a provider's webhook and polling payloads
// commonly share field names), but this has not been verified against a
// real inbound message yet. The complete raw payload is always saved to
// client_sms.raw_payload regardless of whether extraction succeeds, so a
// real test message can be used to confirm/fix the field names afterwards
// without having lost any data in the meantime.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMSEVERYONE_WEBHOOK_TOKEN = Deno.env.get('SMSEVERYONE_WEBHOOK_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function textResponse(body: string, status: number) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } })
}

// Stored phone numbers are free-text (staff-entered, various formats).
// Normalises to the last 9 digits (an AU mobile number without country
// code or leading 0) so "+61412345678", "0412 345 678", and "412345678"
// all compare equal.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.slice(-9)
}

function firstDefined(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value)
  }
  return null
}

const FROM_KEYS = [
  'Recipient', 'recipient', 'From', 'from', 'Mobile', 'mobile', 'Sender', 'sender',
  'Number', 'number', 'Msisdn', 'msisdn', 'MSISDN', 'MobileNumber', 'mobileNumber',
]
const BODY_KEYS = ['MessageText', 'messageText', 'Message', 'message', 'Text', 'text', 'Body', 'body']
const TO_KEYS = ['Originator', 'originator', 'To', 'to', 'Destination', 'destination']

Deno.serve(async (req) => {
  // SMS Everyone's own docs describe inbound delivery as an "HTTP GET
  // webhook" (the opposite of Twilio/Resend, which POST) - so both are
  // accepted here, with GET's data coming from the query string and POST's
  // from the body. Confirmed against real test invocations from SMS
  // Everyone, which were GET requests carrying no recognisable body.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return textResponse('0', 200)
  }

  if (!SMSEVERYONE_WEBHOOK_TOKEN || !SUPABASE_SERVICE_ROLE_KEY) {
    // Still ack with "0" - SMS Everyone isn't equipped to show us a
    // meaningful error response, and we don't want them to keep retrying
    // a misconfigured endpoint indefinitely.
    console.error('Inbound SMS is not configured. Set SMSEVERYONE_WEBHOOK_TOKEN and SUPABASE_SERVICE_ROLE_KEY as function secrets.')
    return textResponse('0', 200)
  }

  const url = new URL(req.url)
  if (url.searchParams.get('token') !== SMSEVERYONE_WEBHOOK_TOKEN) {
    return textResponse('Unauthorized', 401)
  }

  // Start with whatever's in the query string (the GET case, and also
  // covers a POST that additionally puts data there), excluding our own
  // auth token so it's never mistaken for message data.
  const payload: Record<string, unknown> = Object.fromEntries(url.searchParams)
  delete payload.token

  if (req.method === 'POST') {
    const rawBody = await req.text()
    const contentType = req.headers.get('content-type') ?? ''
    try {
      if (contentType.includes('json')) {
        Object.assign(payload, JSON.parse(rawBody))
      } else if (rawBody) {
        Object.assign(payload, Object.fromEntries(new URLSearchParams(rawBody)))
      }
    } catch {
      if (rawBody) payload._unparsed_body = rawBody
    }
  }

  const fromNumber = firstDefined(payload, FROM_KEYS)
  const body = firstDefined(payload, BODY_KEYS)
  const toNumber = firstDefined(payload, TO_KEYS)

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  let clientId: string | null = null
  let relationshipId: string | null = null

  if (fromNumber) {
    const normalizedFrom = normalizePhone(fromNumber)
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
  }

  const { error: logError } = await supabase.from('client_sms').insert({
    client_id: clientId,
    relationship_id: relationshipId,
    direction: 'inbound',
    from_number: fromNumber ?? 'unknown',
    to_number: toNumber ?? 'unknown',
    body: body ?? '(could not be parsed from the inbound payload - see raw_payload)',
    status: 'received',
    read: false,
    raw_payload: payload,
  })

  if (logError) {
    console.error('Failed to log inbound SMS:', logError.message)
  }

  // SMS Everyone's own instruction: acknowledge with a bare "0", nothing
  // else (no HTML, no JSON), regardless of what happened above.
  return textResponse('0', 200)
})
