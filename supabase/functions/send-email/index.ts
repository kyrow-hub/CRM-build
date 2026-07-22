// Supabase Edge Function: send-email
//
// Sends a real email through Resend on behalf of the calling (authenticated)
// user, then logs the result to public.client_emails. The Resend API key
// lives only in this function's environment (set via `supabase secrets
// set`) - it is never sent to or stored in the frontend.
//
// Deploy with: supabase functions deploy send-email
// Required secrets: RESEND_API_KEY, RESEND_FROM_ADDRESS
//
// The caller's own Supabase auth token is forwarded to the Supabase client
// used inside this function, so every database read/write here still goes
// through the normal Row Level Security policies (can_edit_records(), etc.)
// exactly as it would from the browser - this function never uses a
// service-role key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_ADDRESS = Deno.env.get('RESEND_FROM_ADDRESS')
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

  if (!RESEND_API_KEY || !RESEND_FROM_ADDRESS) {
    return jsonResponse(
      { error: 'Email sending is not configured. Set RESEND_API_KEY and RESEND_FROM_ADDRESS as function secrets.' },
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

  let payload: { client_id?: string; to?: string; subject?: string; body?: string }
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { client_id, to, subject, body } = payload
  if (!client_id || !to || !subject || !body) {
    return jsonResponse({ error: 'client_id, to, subject, and body are required' }, 400)
  }

  // Confirms the client exists and is visible to this user under RLS before
  // sending anything on their behalf.
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', client_id)
    .single()
  if (clientError || !client) {
    return jsonResponse({ error: 'Client not found or not accessible' }, 404)
  }

  let status = 'sent'
  let providerMessageId: string | null = null
  let errorMessage: string | null = null

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_ADDRESS,
        to: [to],
        subject,
        text: body,
      }),
    })

    const resendData = await resendResponse.json()
    if (!resendResponse.ok) {
      status = 'failed'
      errorMessage = resendData?.message ?? 'Resend rejected the request'
    } else {
      providerMessageId = resendData?.id ?? null
    }
  } catch (err) {
    status = 'failed'
    errorMessage = err instanceof Error ? err.message : 'Unknown error sending email'
  }

  const { data: logRow, error: logError } = await supabase
    .from('client_emails')
    .insert({
      client_id,
      direction: 'outbound',
      from_address: RESEND_FROM_ADDRESS,
      to_address: to,
      subject,
      body,
      status,
      provider_message_id: providerMessageId,
      error_message: errorMessage,
      sent_by: user.id,
    })
    .select()
    .single()

  if (logError) {
    return jsonResponse({ error: `Email ${status} but the log entry failed to save: ${logError.message}` }, 500)
  }

  if (status === 'failed') {
    return jsonResponse({ error: errorMessage, email: logRow }, 502)
  }

  return jsonResponse({ email: logRow }, 200)
})
