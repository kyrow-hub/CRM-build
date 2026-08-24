import { supabase } from '../lib/supabase.js'

// Attendance is recorded against a specific dated session of a program.
// getOrCreateSession finds today's (or the chosen date's) session for a
// program, creating one on the fly if this is the first attendance logged
// for that program/date combination - this keeps the "log attendance" form
// a single step for staff while still writing to the real, relational
// program_sessions table underneath.
export async function getOrCreateSession({ programId, sessionDate, createdBy }) {
  const { data: existing, error: findError } = await supabase
    .from('program_sessions')
    .select('*')
    .eq('program_id', programId)
    .eq('session_date', sessionDate)
    .maybeSingle()
  if (findError) throw findError
  if (existing) return existing

  const { data: created, error: createError } = await supabase
    .from('program_sessions')
    .insert({ program_id: programId, session_date: sessionDate, created_by: createdBy })
    .select('*')
    .single()
  if (createError) throw createError
  return created
}

const ATTENDANCE_COLUMNS = '*, client:clients(id, first_name, last_name), session:program_sessions(id, session_date, program:programs(id, name))'

export async function listAttendanceRecords() {
  const { data, error } = await supabase
    .from('attendance')
    .select(ATTENDANCE_COLUMNS)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listAttendanceRecordsForClient(clientId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, attendance_status, session:program_sessions(id, session_date, overnight_camp)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Every attendance record system-wide with just the fields needed for
// compliance (last service date, camp attendance) - avoids the heavier
// client/program join used by listAttendanceRecords.
export async function listAllAttendanceForCompliance() {
  const { data, error } = await supabase
    .from('attendance')
    .select('client_id, attendance_status, session:program_sessions(session_date, overnight_camp)')
  if (error) throw error
  return data
}

export async function createAttendanceRecord(input) {
  const { data, error } = await supabase.from('attendance').insert(input).select(ATTENDANCE_COLUMNS).single()
  if (error) throw error
  return data
}

export async function updateAttendanceRecord(id, input) {
  const { data, error } = await supabase.from('attendance').update(input).eq('id', id).select(ATTENDANCE_COLUMNS).single()
  if (error) throw error
  return data
}

export async function deleteAttendanceRecord(id) {
  const { error } = await supabase.from('attendance').delete().eq('id', id)
  if (error) throw error
}
