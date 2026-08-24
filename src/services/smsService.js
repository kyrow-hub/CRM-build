import { supabase } from '../lib/supabase.js'

const SMS_COLUMNS =
  '*, client:clients(id, first_name, last_name), relationship:client_relationships(id, full_name, relationship_type)'

export async function listAllSms(limit = 200) {
  const { data, error } = await supabase
    .from('client_sms')
    .select(SMS_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// Calls the send-sms Edge Function, which holds the Twilio credentials
// server-side and performs the actual send - the frontend never talks to
// Twilio directly. See supabase/functions/send-sms.
export async function sendSms({ clientId, relationshipId, to, body }) {
  if (!to?.trim()) throw new Error('Recipient phone number is required.')
  if (!body?.trim()) throw new Error('Message is required.')

  const { data, error } = await supabase.functions.invoke('send-sms', {
    body: { client_id: clientId || null, relationship_id: relationshipId || null, to: to.trim(), body: body.trim() },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.sms
}

// Sends the same message to many recipients (bulk send). Runs sequentially
// so a slow/failing send can't spike concurrent Edge Function invocations,
// and returns a per-recipient result list rather than throwing, so the UI
// can report a "N sent, M failed" summary instead of aborting partway.
export async function sendBulkSms(recipients, body) {
  const results = []
  for (const recipient of recipients) {
    try {
      const sms = await sendSms({ clientId: recipient.clientId, relationshipId: recipient.relationshipId, to: recipient.to, body })
      results.push({ recipient, sms, error: null })
    } catch (err) {
      results.push({ recipient, sms: null, error: err.message })
    }
  }
  return results
}

// Inbound SMS from an unrecognised number arrive with no client_id (see
// supabase/functions/receive-sms) - this lets staff associate one after the
// fact once they've worked out who it's from.
export async function linkSmsToClient(smsId, clientId) {
  const { data, error } = await supabase
    .from('client_sms')
    .update({ client_id: clientId })
    .eq('id', smsId)
    .select(SMS_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function deleteSms(smsId) {
  const { error } = await supabase.from('client_sms').delete().eq('id', smsId)
  if (error) throw error
}

export async function markSmsRead(smsId, read = true) {
  const { data, error } = await supabase
    .from('client_sms')
    .update({ read })
    .eq('id', smsId)
    .select(SMS_COLUMNS)
    .single()
  if (error) throw error
  return data
}
