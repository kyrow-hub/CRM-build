import { supabase } from '../lib/supabase.js'

const OUTCOME_COLUMNS = '*, author:profiles!created_by(id, first_name, last_name)'

export async function listClientOutcomes(clientId) {
  const { data, error } = await supabase
    .from('client_outcomes')
    .select(OUTCOME_COLUMNS)
    .eq('client_id', clientId)
    .order('outcome_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createOutcome(input) {
  if (!input.category) throw new Error('Category is required.')
  if (!input.outcome_type?.trim()) throw new Error('Outcome type is required.')
  const { data, error } = await supabase.from('client_outcomes').insert(input).select(OUTCOME_COLUMNS).single()
  if (error) throw error
  return data
}

export async function countOutcomesByCategory() {
  const { data, error } = await supabase.from('client_outcomes').select('category')
  if (error) throw error
  return data.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1
    return acc
  }, {})
}

export async function listAllOutcomes(limit = 50) {
  const { data, error } = await supabase
    .from('client_outcomes')
    .select('*, client:clients(id, first_name, last_name)')
    .order('outcome_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
