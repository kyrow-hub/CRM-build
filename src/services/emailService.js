import { supabase } from '../lib/supabase.js'

const EMAIL_COLUMNS = '*, client:clients(id, first_name, last_name)'

export async function listAllEmails(limit = 200) {
  const { data, error } = await supabase
    .from('client_emails')
    .select(EMAIL_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// Calls the send-email Edge Function, which holds the Resend API key
// server-side and performs the actual send - the frontend never talks to
// Resend directly. See supabase/functions/send-email.
export async function sendEmail({ clientId, to, subject, body }) {
  if (!to?.trim()) throw new Error('Recipient email is required.')
  if (!subject?.trim()) throw new Error('Subject is required.')
  if (!body?.trim()) throw new Error('Message body is required.')

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { client_id: clientId, to: to.trim(), subject: subject.trim(), body: body.trim() },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.email
}

// Inbound emails from unrecognised senders arrive with no client_id (see
// supabase/functions/receive-email) - this lets staff associate one after
// the fact once they've worked out who it's from.
export async function linkEmailToClient(emailId, clientId) {
  const { data, error } = await supabase
    .from('client_emails')
    .update({ client_id: clientId })
    .eq('id', emailId)
    .select(EMAIL_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function markEmailRead(emailId, read = true) {
  const { data, error } = await supabase
    .from('client_emails')
    .update({ read })
    .eq('id', emailId)
    .select(EMAIL_COLUMNS)
    .single()
  if (error) throw error
  return data
}
