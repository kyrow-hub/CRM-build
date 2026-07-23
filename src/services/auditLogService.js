import { supabase } from '../lib/supabase.js'

const AUDIT_COLUMNS = '*, actor:profiles(id, first_name, last_name, email)'

// Tables covered by the audit_row_change() trigger (see
// 0029_audit_log.sql) - kept in sync manually since Postgres has no easy
// way to introspect "which tables have this specific trigger" from the
// client. Used to populate the table filter dropdown.
export const AUDITED_TABLES = [
  { value: 'clients', label: 'Clients' },
  { value: 'client_relationships', label: 'Family & Contacts' },
  { value: 'client_notes', label: 'Case Notes' },
  { value: 'case_activities', label: 'Activities' },
  { value: 'client_outcomes', label: 'Outcomes' },
  { value: 'client_documents', label: 'Documents' },
  { value: 'incidents', label: 'Incidents' },
  { value: 'client_assessments', label: 'Assessments' },
  { value: 'referrals', label: 'Referrals' },
  { value: 'profiles', label: 'Staff Profiles' },
]

export async function listAuditLog({ tableName = '', action = '', recordId = '', limit = 200 } = {}) {
  let query = supabase.from('audit_log').select(AUDIT_COLUMNS).order('created_at', { ascending: false }).limit(limit)
  if (tableName) query = query.eq('table_name', tableName)
  if (action) query = query.eq('action', action)
  if (recordId.trim()) query = query.eq('record_id', recordId.trim())

  const { data, error } = await query
  if (error) throw error
  return data
}
