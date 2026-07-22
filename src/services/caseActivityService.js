import { supabase } from '../lib/supabase.js'

const ACTIVITY_COLUMNS = '*, author:profiles!created_by(id, first_name, last_name)'

export async function listClientCaseActivities(clientId) {
  const { data, error } = await supabase
    .from('case_activities')
    .select(ACTIVITY_COLUMNS)
    .eq('client_id', clientId)
    .order('activity_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createCaseActivity(input) {
  if (!input.activity_type) throw new Error('Activity type is required.')
  const { data, error } = await supabase.from('case_activities').insert(input).select(ACTIVITY_COLUMNS).single()
  if (error) throw error
  return data
}

export async function countCaseActivities() {
  const { count, error } = await supabase.from('case_activities').select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function listAllCaseActivities(limit = 50) {
  const { data, error } = await supabase
    .from('case_activities')
    .select('*, client:clients(id, first_name, last_name)')
    .order('activity_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function countCaseActivitiesByType() {
  const { data, error } = await supabase.from('case_activities').select('activity_type')
  if (error) throw error
  return data.reduce((acc, r) => {
    acc[r.activity_type] = (acc[r.activity_type] ?? 0) + 1
    return acc
  }, {})
}
