import { supabase } from '../lib/supabase.js'

const ASSIGNMENT_COLUMNS = '*, worker:profiles!profile_id(id, first_name, last_name, role)'

export async function listClientStaffAssignments(clientId) {
  const { data, error } = await supabase
    .from('client_staff_assignments')
    .select(ASSIGNMENT_COLUMNS)
    .eq('client_id', clientId)
    .order('assigned_date', { ascending: false })
  if (error) throw error
  return data
}

export async function addStaffAssignment(input) {
  if (!input.profile_id && !input.external_name?.trim()) {
    throw new Error('Select a staff member or enter an external worker\'s name.')
  }
  const { data, error } = await supabase
    .from('client_staff_assignments')
    .insert(input)
    .select(ASSIGNMENT_COLUMNS)
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('That staff member already has this role on this client.')
    throw error
  }
  return data
}

export async function updateStaffAssignment(id, input) {
  const { data, error } = await supabase
    .from('client_staff_assignments')
    .update(input)
    .eq('id', id)
    .select(ASSIGNMENT_COLUMNS)
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('That staff member already has this role on this client.')
    throw error
  }
  return data
}

export async function removeStaffAssignment(id) {
  const { error } = await supabase.from('client_staff_assignments').delete().eq('id', id)
  if (error) throw error
}
