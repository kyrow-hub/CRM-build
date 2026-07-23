import { supabase } from '../lib/supabase.js'

const GOAL_COLUMNS = '*, responsible:profiles!responsible_person(id, first_name, last_name)'

export async function listClientGoals(clientId) {
  const { data, error } = await supabase
    .from('client_goals')
    .select(GOAL_COLUMNS)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createClientGoal(input) {
  if (!input.title?.trim()) throw new Error('Goal title is required.')
  const { data, error } = await supabase.from('client_goals').insert(input).select(GOAL_COLUMNS).single()
  if (error) throw error
  return data
}

export async function updateClientGoal(id, input) {
  if (!input.title?.trim()) throw new Error('Goal title is required.')
  const { data, error } = await supabase.from('client_goals').update(input).eq('id', id).select(GOAL_COLUMNS).single()
  if (error) throw error
  return data
}

export async function deleteClientGoal(id) {
  const { error } = await supabase.from('client_goals').delete().eq('id', id)
  if (error) throw error
}

export async function countClientGoals() {
  const { count, error } = await supabase.from('client_goals').select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function listAllClientGoals(limit = 50) {
  const { data, error } = await supabase
    .from('client_goals')
    .select('*, client:clients(id, first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
