import { supabase } from '../lib/supabase.js'

export async function listClientEmails(clientId) {
  const { data, error } = await supabase
    .from('client_emails')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listAllEmails(limit = 100) {
  const { data, error } = await supabase
    .from('client_emails')
    .select('*, client:clients(id, first_name, last_name)')
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
