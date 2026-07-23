// Supabase Edge Function: send-sms
//
// Sends a real SMS through Twilio on behalf of the calling (authenticated)
// user, then logs the result to public.client_sms. The Twilio Account SID
// and Auth Token live only in this function's environment (set via
// `supabase secrets set`) - they are never sent to or stored in the
// frontend.
//
// Deploy with: supabase functions deploy send-sms
// Required secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
//
// The caller's own Supabase auth token is forwarded to the Supabase client
// used inside this function, so every database read/write here still goes
// through the normal Row Level Security policies (can_edit_records(), etc.)
// exactly as it would from the browser - this function never uses a
// service-role key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return jsonResponse(
      {
        error:
          'SMS sending is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER as function secrets.',
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

  let status = 'sent'
  let providerMessageId: string | null = null
  let errorMessage: string | null = null

  try {
    const form = new URLSearchParams()
    form.set('To', to)
    form.set('From', TWILIO_FROM_NUMBER)
    form.set('Body', body)

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      },
    )

    const twilioData = await twilioResponse.json()
    if (!twilioResponse.ok) {
      status = 'failed'
      errorMessage = twilioData?.message ?? 'Twilio rejected the request'
    } else {
      providerMessageId = twilioData?.sid ?? null
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
      from_number: TWILIO_FROM_NUMBER,
      to_number: to,
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
