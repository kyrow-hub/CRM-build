import { supabase } from '../lib/supabase.js'

const RISK_ASSESSMENT_COLUMNS = '*, assessor:profiles!assessor_id(id, first_name, last_name)'

// Every risk assessment across every program/session - annual
// Program/Activity assessments (session_id null) and per-camp assessments
// (session_id set) both come back from this one query and are split out
// client-side, matching the rest of the app's aggregation pattern.
export async function listAllProgramRiskAssessments() {
  const { data, error } = await supabase
    .from('program_risk_assessments')
    .select(RISK_ASSESSMENT_COLUMNS)
    .order('assessment_date', { ascending: false })
  if (error) throw error
  return data
}

// Every overnight camp session (regardless of whether a group note has
// been written yet), so the panel can show which camps still need a
// risk assessment.
export async function listCampSessions() {
  const { data, error } = await supabase
    .from('program_sessions')
    .select('id, session_date, location, program:programs(id, name)')
    .eq('overnight_camp', true)
    .order('session_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createProgramRiskAssessment(input) {
  if (!input.program_id) throw new Error('A program is required.')
  const { data, error } = await supabase
    .from('program_risk_assessments')
    .insert(input)
    .select(RISK_ASSESSMENT_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function deleteProgramRiskAssessment(id) {
  const { error } = await supabase.from('program_risk_assessments').delete().eq('id', id)
  if (error) throw error
}
