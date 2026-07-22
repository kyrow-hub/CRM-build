import { supabase } from '../lib/supabase.js'

export async function listClientGoals(clientId) {
  const { data, error } = await supabase
    .from('client_goals')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createClientGoal(input) {
  if (!input.title?.trim()) throw new Error('Goal title is required.')
  const { data, error } = await supabase.from('client_goals').insert(input).select('*').single()
  if (error) throw error
  return data
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
