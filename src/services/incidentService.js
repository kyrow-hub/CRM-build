import { supabase } from '../lib/supabase.js'

const INCIDENT_COLUMNS =
  '*, client:clients(id, first_name, last_name), program:programs(id, name), reporter:profiles!reported_by(id, first_name, last_name), reviewer:profiles!manager_reviewed_by(id, first_name, last_name)'

export function isIncidentReadyToClose(incident) {
  return Boolean(incident.manager_reviewed && incident.follow_up_completed && incident.outcome?.trim())
}

export function incidentMissingForClose(incident) {
  const missing = []
  if (!incident.manager_reviewed) missing.push('Manager Review')
  if (!incident.follow_up_completed) missing.push('Follow-up completed')
  if (!incident.outcome?.trim()) missing.push('Outcome recorded')
  return missing
}

export async function listIncidents({ status = '', severity = '' } = {}) {
  let query = supabase.from('incidents').select(INCIDENT_COLUMNS).order('incident_date', { ascending: false })
  if (status) query = query.eq('status', status)
  if (severity) query = query.eq('severity', severity)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function listIncidentsForClient(clientId) {
  const { data, error } = await supabase
    .from('incidents')
    .select(INCIDENT_COLUMNS)
    .eq('client_id', clientId)
    .order('incident_date', { ascending: false })
  if (error) throw error
  return data
}

// Every incident, for the compliance engine and Reports/Dashboard - kept
// lean (no joins) since it doesn't need display-only fields.
export async function listAllIncidents() {
  const { data, error } = await supabase
    .from('incidents')
    .select('id, client_id, incident_date, incident_type, severity, status, manager_reviewed, follow_up_completed, outcome')
  if (error) throw error
  return data
}

export async function createIncident(input) {
  if (!input.incident_type) throw new Error('Incident type is required.')
  if (!input.severity) throw new Error('Severity is required.')
  if (!input.description?.trim()) throw new Error('Description is required.')
  const { data, error } = await supabase.from('incidents').insert(input).select(INCIDENT_COLUMNS).single()
  if (error) throw error
  return data
}

export async function updateIncident(id, input) {
  const { data, error } = await supabase.from('incidents').update(input).eq('id', id).select(INCIDENT_COLUMNS).single()
  if (error) throw error
  return data
}

export async function markManagerReviewed(id, { reviewedBy, reviewNotes }) {
  return updateIncident(id, {
    manager_reviewed: true,
    manager_reviewed_by: reviewedBy,
    manager_reviewed_at: new Date().toISOString(),
    review_notes: reviewNotes || null,
    status: 'Under Review',
  })
}

export async function setFollowUpCompleted(id, { completed, notes }) {
  return updateIncident(id, { follow_up_completed: completed, follow_up_notes: notes || null })
}

export async function recordOutcome(id, outcome) {
  return updateIncident(id, { outcome: outcome || null })
}

// Enforces "cannot close until complete" server-side (in addition to the
// UI disabling the Close action), so the rule holds even if called from
// somewhere else in the app later.
export async function closeIncident(incident) {
  const missing = incidentMissingForClose(incident)
  if (missing.length > 0) {
    throw new Error(`Can't close this incident yet - still missing: ${missing.join(', ')}.`)
  }
  return updateIncident(incident.id, { status: 'Closed', closed_at: new Date().toISOString() })
}

export async function reopenIncident(id) {
  return updateIncident(id, { status: 'Open', closed_at: null })
}

export async function countOpenIncidents() {
  const { count, error } = await supabase.from('incidents').select('id', { count: 'exact', head: true }).neq('status', 'Closed')
  if (error) throw error
  return count ?? 0
}
