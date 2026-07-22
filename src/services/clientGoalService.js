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
