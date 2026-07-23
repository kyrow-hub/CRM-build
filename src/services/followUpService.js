import { supabase } from '../lib/supabase.js'

const FOLLOW_UP_COLUMNS = '*, assignee:profiles!assigned_to(id, first_name, last_name)'

export async function listClientFollowUps(clientId) {
  const { data, error } = await supabase
    .from('client_follow_ups')
    .select(FOLLOW_UP_COLUMNS)
    .eq('client_id', clientId)
    .order('due_date', { ascending: true })
  if (error) throw error
  return data
}

export async function listAllFollowUps() {
  const { data, error } = await supabase.from('client_follow_ups').select('id, client_id, title, status, due_date')
  if (error) throw error
  return data
}

export async function createFollowUp(input) {
  if (!input.title?.trim()) throw new Error('Title is required.')
  if (!input.due_date) throw new Error('Due date is required.')
  const { data, error } = await supabase.from('client_follow_ups').insert(input).select(FOLLOW_UP_COLUMNS).single()
  if (error) throw error
  return data
}

export async function updateFollowUpStatus(id, status) {
  const { data, error } = await supabase
    .from('client_follow_ups')
    .update({ status, completed_at: status === 'Completed' ? new Date().toISOString() : null })
    .eq('id', id)
    .select(FOLLOW_UP_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function updateFollowUp(id, input) {
  if (!input.title?.trim()) throw new Error('Title is required.')
  if (!input.due_date) throw new Error('Due date is required.')
  const { data, error } = await supabase.from('client_follow_ups').update(input).eq('id', id).select(FOLLOW_UP_COLUMNS).single()
  if (error) throw error
  return data
}

export async function deleteFollowUp(id) {
  const { error } = await supabase.from('client_follow_ups').delete().eq('id', id)
  if (error) throw error
}
