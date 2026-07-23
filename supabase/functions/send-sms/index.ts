// Supabase Edge Function: send-sms
//
// Sends a real SMS through SMS Everyone (smseveryone.com.au) on behalf of
// the calling (authenticated) user, then logs the result to
// public.client_sms. The SMS Everyone username/password live only in this
// function's environment (set via `supabase secrets set`) - they are never
// sent to or stored in the frontend.
//
// Deploy with: supabase functions deploy send-sms
// Required secrets: SMSEVERYONE_USERNAME, SMSEVERYONE_PASSWORD,
// SMSEVERYONE_ORIGINATOR (the dedicated virtual number or alpha sender ID
// SMS Everyone assigned to this account)
//
// API reference: https://www.smseveryone.com.au/restapi (Campaign Request).
// Unofficial NodeJS wrapper - used here to confirm the exact request shape
// since the HTML docs don't show a raw example - https://github.com/minusInfinite/smseveryone-node
//
// The caller's own Supabase auth token is forwarded to the Supabase client
// used inside this function, so every database read/write here still goes
// through the normal Row Level Security policies (can_edit_records(), etc.)
// exactly as it would from the browser - this function never uses a
// service-role key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMSEVERYONE_USERNAME = Deno.env.get('SMSEVERYONE_USERNAME')
const SMSEVERYONE_PASSWORD = Deno.env.get('SMSEVERYONE_PASSWORD')
const SMSEVERYONE_ORIGINATOR = Deno.env.get('SMSEVERYONE_ORIGINATOR')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

const SMSEVERYONE_API_BASE = 'https://smseveryone.com/api'

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// SMS Everyone expects Australian numbers as digits only with the country
// code and no leading +/0 (e.g. "61412345678"), matching the format shown
// in their own dashboard. Staff enter phone numbers in free-text format
// (spaces, +61, leading 0, etc.), so this normalises before sending.
function toSmsEveryoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('61')) return digits
  if (digits.startsWith('0')) return `61${digits.slice(1)}`
  return `61${digits}`
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!SMSEVERYONE_USERNAME || !SMSEVERYONE_PASSWORD || !SMSEVERYONE_ORIGINATOR) {
    return jsonResponse(
      {
        error:
          'SMS sending is not configured. Set SMSEVERYONE_USERNAME, SMSEVERYONE_PASSWORD, and SMSEVERYONE_ORIGINATOR as function secrets.',
      },
      500,
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header' }, 401)
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return jsonResponse({ error: 'Not authenticated' }, 401)
  }

  let payload: { client_id?: string | null; relationship_id?: string | null; to?: string; body?: string }
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { client_id, relationship_id, to, body } = payload
  if (!to || !body) {
    return jsonResponse({ error: 'to and body are required' }, 400)
  }

  // Confirms the client (and, if given, the relationship) exist and are
  // visible to this user under RLS before sending anything on their behalf.
  if (client_id) {
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .single()
    if (clientError || !client) {
      return jsonResponse({ error: 'Client not found or not accessible' }, 404)
    }
  }
  if (relationship_id) {
    const { data: relationship, error: relationshipError } = await supabase
      .from('client_relationships')
      .select('id')
      .eq('id', relationship_id)
      .single()
    if (relationshipError || !relationship) {
      return jsonResponse({ error: 'Relationship not found or not accessible' }, 404)
    }
  }

  const destination = toSmsEveryoneNumber(to)

  let status = 'sent'
  let providerMessageId: string | null = null
  let errorMessage: string | null = null

  try {
    const smsResponse = await fetch(`${SMSEVERYONE_API_BASE}/campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${btoa(`${SMSEVERYONE_USERNAME}:${SMSEVERYONE_PASSWORD}`)}`,
      },
      body: JSON.stringify({
        action: 'create',
        originator: SMSEVERYONE_ORIGINATOR,
        destinations: [destination],
        message: body,
      }),
    })

    const rawText = await smsResponse.text()
    let smsData: Record<string, unknown> | null = null
    try {
      smsData = JSON.parse(rawText)
    } catch {
      smsData = null
    }

    console.log('SMS Everyone response:', smsResponse.status, rawText)

    // Success requires an unambiguous Code === 0 from a parsed JSON body -
    // anything else (a non-2xx status, an unparseable body, a missing or
    // non-zero Code) is treated as a failure rather than assumed to be
    // fine, so a shape mismatch with SMS Everyone's actual API can't
    // silently look like a successful send. The raw response is included
    // in the error so it's visible directly on the SMS page without
    // needing to check the Edge Function logs.
    if (smsResponse.ok && smsData && typeof smsData.Code === 'number' && smsData.Code === 0) {
      providerMessageId = smsData.CampaignId != null ? String(smsData.CampaignId) : null
    } else {
      status = 'failed'
      const messageFromBody = smsData && typeof smsData.Message === 'string' ? smsData.Message : null
      errorMessage =
        messageFromBody ??
        `SMS Everyone did not confirm the send (HTTP ${smsResponse.status}). Raw response: ${rawText.slice(0, 300)}`
    }
  } catch (err) {
    status = 'failed'
    errorMessage = err instanceof Error ? err.message : 'Unknown error sending SMS'
  }

  const { data: logRow, error: logError } = await supabase
    .from('client_sms')
    .insert({
      client_id: client_id ?? null,
      relationship_id: relationship_id ?? null,
      direction: 'outbound',
      from_number: SMSEVERYONE_ORIGINATOR,
      to_number: destination,
      body,
      status,
      provider_message_id: providerMessageId,
      error_message: errorMessage,
      sent_by: user.id,
    })
    .select()
    .single()

  if (logError) {
    return jsonResponse({ error: `SMS ${status} but the log entry failed to save: ${logError.message}` }, 500)
  }

  if (status === 'failed') {
    return jsonResponse({ error: errorMessage, sms: logRow }, 502)
  }

  return jsonResponse({ sms: logRow }, 200)
})
