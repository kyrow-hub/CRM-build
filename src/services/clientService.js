import { supabase } from '../lib/supabase.js'

const CLIENT_COLUMNS = '*, assigned_worker:profiles!assigned_worker_id(id, first_name, last_name)'

function validateClientInput({ first_name, last_name, date_of_birth }) {
  if (!first_name?.trim()) throw new Error('First name is required.')
  if (!last_name?.trim()) throw new Error('Last name is required.')
  if (date_of_birth) {
    const dob = new Date(date_of_birth)
    if (dob > new Date()) throw new Error('Date of birth cannot be in the future.')
  }
}

export async function listClients({ search = '', status = '', assignedWorkerId = '' } = {}) {
  let query = supabase
    .from('clients')
    .select(CLIENT_COLUMNS)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (search.trim()) {
    const term = search.trim()
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,client_number.ilike.%${term}%,phone.ilike.%${term}%`,
    )
  }
  if (status) query = query.eq('status', status)
  if (assignedWorkerId) query = query.eq('assigned_worker_id', assignedWorkerId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getClientById(id) {
  const { data, error } = await supabase.from('clients').select(CLIENT_COLUMNS).eq('id', id).single()
  if (error) throw error
  return data
}

export async function createClient(input) {
  validateClientInput(input)
  const { data, error } = await supabase.from('clients').insert(input).select(CLIENT_COLUMNS).single()
  if (error) {
    if (error.code === '23505') throw new Error('That client number is already in use.')
    throw error
  }
  return data
}

export async function updateClient(id, input) {
  validateClientInput(input)
  const { data, error } = await supabase
    .from('clients')
    .update(input)
    .eq('id', id)
    .select(CLIENT_COLUMNS)
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('That client number is already in use.')
    throw error
  }
  return data
}

export async function archiveClient(id) {
  const { data, error } = await supabase
    .from('clients')
    .update({ archived_at: new Date().toISOString(), status: 'archived' })
    .eq('id', id)
    .select(CLIENT_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function countClientsWithDetails() {
  const { count, error } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .is('archived_at', null)
    .or('gender.not.is.null,indigenous_status.not.is.null,date_of_birth.not.is.null')
  if (error) throw error
  return count ?? 0
}

// Returns every client (including archived/closed ones) with just the
// fields needed for demographic reporting, so Reports can aggregate the
// whole population rather than only active clients.
export async function listClientsForReports() {
  const { data, error } = await supabase
    .from('clients')
    .select(
      'id, status, date_of_birth, gender, indigenous_status, risk_level, cultural_background, postcode, suburb, date_opened, date_closed, archived_at',
    )
  if (error) throw error
  return data
}

export async function listAssignableWorkers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .eq('active', true)
    .order('first_name')
  if (error) throw error
  return data
}
