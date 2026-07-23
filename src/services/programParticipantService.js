import { supabase } from '../lib/supabase.js'

const PARTICIPANT_COLUMNS = '*, client:clients(id, first_name, last_name)'

export async function listProgramParticipants(programId) {
  const { data, error } = await supabase
    .from('program_participants')
    .select(PARTICIPANT_COLUMNS)
    .eq('program_id', programId)
    .order('joined_date', { ascending: true })
  if (error) throw error
  return data
}

export async function addProgramParticipant({ programId, clientId, createdBy }) {
  const { data, error } = await supabase
    .from('program_participants')
    .insert({ program_id: programId, client_id: clientId, created_by: createdBy })
    .select(PARTICIPANT_COLUMNS)
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('This participant is already on the roster.')
    throw error
  }
  return data
}

export async function removeProgramParticipant(id) {
  const { error } = await supabase.from('program_participants').delete().eq('id', id)
  if (error) throw error
}
