import { supabase } from '../lib/supabase.js'

const ASSESSMENT_COLUMNS = '*, assessor:profiles!assessor_id(id, first_name, last_name)'

export async function listClientAssessments(clientId) {
  const { data, error } = await supabase
    .from('client_assessments')
    .select(ASSESSMENT_COLUMNS)
    .eq('client_id', clientId)
    .order('assessment_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createAssessment(input) {
  if (!input.assessment_type) throw new Error('Assessment type is required.')
  const { data, error } = await supabase.from('client_assessments').insert(input).select(ASSESSMENT_COLUMNS).single()
  if (error) throw error
  return data
}

export async function deleteAssessment(id) {
  const { error } = await supabase.from('client_assessments').delete().eq('id', id)
  if (error) throw error
}
