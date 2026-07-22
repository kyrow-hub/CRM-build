import { supabase } from '../lib/supabase.js'

const NOTE_COLUMNS = '*, author:profiles!created_by(id, first_name, last_name)'

export async function listClientNotes(clientId) {
  const { data, error } = await supabase
    .from('client_notes')
    .select(NOTE_COLUMNS)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createClientNote(input) {
  if (!input.content?.trim()) throw new Error('Note content is required.')
  const { data, error } = await supabase.from('client_notes').insert(input).select(NOTE_COLUMNS).single()
  if (error) throw error
  return data
}
