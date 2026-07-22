// Supabase Edge Function: receive-email
//
// Webhook endpoint for Resend's inbound email delivery. When your domain's
// MX records point at Resend and an email arrives, Resend POSTs the parsed
// message here. This verifies the request really came from Resend (Resend
// signs webhooks using Svix), tries to match the sender to an existing
// client by email address, and logs the message to public.client_emails.
//
// Deploy with: supabase functions deploy receive-email --no-verify-jwt
// Required secrets: RESEND_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
//
// --no-verify-jwt is required because Resend calls this endpoint directly,
// not as a logged-in CRM user - there is no Supabase auth token to check.
// Authenticity instead comes entirely from the Svix signature below, which
// is why verifying it correctly matters.
//
// This function necessarily uses the service-role key (unlike send-email,
// which forwards the caller's own token) because there is no user session
// to act as - Resend is not a signed-in member of staff. The service-role
// key bypasses Row Level Security entirely, so this function must only
// ever insert the exact fields below and must not be extended to do
// anything else without careful review.
//
// NOTE: the exact JSON shape of Resend's inbound webhook payload is best
// confirmed against the "Webhooks" delivery log in your Resend dashboard
// the first time a real email arrives - the field access below follows
// Resend's documented format as of this writing, but third-party payload
// shapes do sometimes shift. If parsing fails, check that log first.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

// Resend delivers webhooks via Svix. Verification: HMAC-SHA256 of
// "{svix-id}.{svix-timestamp}.{raw body}" using the webhook secret, then
// compare against the (possibly multiple, space-separated) signatures in
// the svix-signature header. See https://docs.svix.com/receiving/verifying-payloads/how.
async function verifySvixSignature(rawBody: string, headers: Headers, secret: string): Promise<boolean> {
  const svixId = headers.get('svix-id')
  const svixTimestamp = headers.get('svix-timestamp')
  const svixSignature = headers.get('svix-signature')
  if (!svixId || !svixTimestamp || !svixSignature) return false

  const timestamp = parseInt(svixTimestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > 300) return false

  const secretBytes = base64ToBytes(secret.startsWith('whsec_') ? secret.slice(6) : secret)
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`

  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))
  const expectedSignature = bytesToBase64(new Uint8Array(signatureBytes))

  const providedSignatures = svixSignature
    .split(' ')
    .map((part) => part.split(',')[1])
    .filter(Boolean)

  return providedSignatures.includes(expectedSignature)
}

function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/)
  return (match ? match[1] : raw).trim().toLowerCase()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!RESEND_WEBHOOK_SECRET || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      { error: 'Inbound email is not configured. Set RESEND_WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY as function secrets.' },
      500,
    )
  }

  const rawBody = await req.text()

  const verified = await verifySvixSignature(rawBody, req.headers, RESEND_WEBHOOK_SECRET)
  if (!verified) {
    return jsonResponse({ error: 'Signature verification failed' }, 401)
  }

  let payload: { type?: string; data?: Record<string, unknown> }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (payload.type !== 'email.received') {
    // Not an inbound-email event (Resend sends other event types on the
    // same webhook if you subscribe to more than one) - acknowledge and
    // ignore rather than erroring.
    return jsonResponse({ ignored: true }, 200)
  }

  const data = payload.data ?? {}
  const fromRaw = String(data.from ?? '')
  const toRaw = Array.isArray(data.to) ? String(data.to[0] ?? '') : String(data.to ?? '')
  const subject = String(data.subject ?? '(no subject)')
  const body = String(data.text ?? data.html ?? '')

  if (!fromRaw) {
    return jsonResponse({ error: 'Missing sender address in payload' }, 400)
  }

  const fromAddress = extractEmailAddress(fromRaw)
  const toAddress = extractEmailAddress(toRaw)

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  const { data: matchedClients } = await supabase
    .from('clients')
    .select('id')
    .ilike('email', fromAddress)
    .is('archived_at', null)
    .limit(1)
  const clientId = matchedClients?.[0]?.id ?? null

  const { data: logRow, error: logError } = await supabase
    .from('client_emails')
    .insert({
      client_id: clientId,
      direction: 'inbound',
      from_address: fromAddress,
      to_address: toAddress,
      subject,
      body,
      status: 'received',
      read: false,
    })
    .select()
    .single()

  if (logError) {
    return jsonResponse({ error: `Failed to log inbound email: ${logError.message}` }, 500)
  }

  return jsonResponse({ email: logRow }, 200)
})
