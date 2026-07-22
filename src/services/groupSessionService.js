import { supabase } from '../lib/supabase.js'

const SESSION_COLUMNS =
  '*, program:programs(id, name, location), facilitator:profiles!facilitator_id(id, first_name, last_name)'

function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

function buildGroupNoteContent({ programName, location, sessionDate, status, groupNote }) {
  return [
    `Service Delivered: ${programName}`,
    `Date: ${formatDate(sessionDate)}`,
    `Attendance: ${status}`,
    `Linked Group Session: ${programName}${location ? ` - ${location}` : ''}`,
    `Group Note: ${groupNote}`,
  ].join('\n')
}

export async function createGroupSession(input) {
  if (!input.program_id) throw new Error('Program is required.')
  if (!input.session_date) throw new Error('Session date is required.')
  const { data, error } = await supabase.from('program_sessions').insert(input).select(SESSION_COLUMNS).single()
  if (error) throw error
  return data
}

export async function recordGroupAttendance(sessionId, participants, recordedBy) {
  if (!participants.length) throw new Error('Add at least one participant.')
  const rows = participants.map((p) => ({
    session_id: sessionId,
    client_id: p.clientId,
    attendance_status: p.status,
    recorded_by: recordedBy,
  }))
  const { data, error } = await supabase
    .from('attendance')
    .insert(rows)
    .select('*, client:clients(id, first_name, last_name)')
  if (error) throw error
  return data
}

// Copies the one shared group note onto an individual client_notes row for
// every attendee, so each participant's case note history reflects what
// happened in the session without staff retyping it per person.
export async function fanOutGroupNote({ session, groupNote, attendanceRows, createdBy }) {
  if (!groupNote?.trim()) return []
  const programName = session.program?.name ?? 'Program'
  const rows = attendanceRows.map((a) => ({
    client_id: a.client_id,
    session_id: session.id,
    is_group_note: true,
    note_type: 'Group Session',
    content: buildGroupNoteContent({
      programName,
      location: session.location,
      sessionDate: session.session_date,
      status: a.attendance_status,
      groupNote: groupNote.trim(),
    }),
    created_by: createdBy,
  }))
  const { data, error } = await supabase.from('client_notes').insert(rows).select('*')
  if (error) throw error
  return data
}

export async function addIndividualSessionNote({ clientId, sessionId, content, createdBy }) {
  const { data, error } = await supabase
    .from('client_notes')
    .insert({
      client_id: clientId,
      session_id: sessionId,
      is_group_note: false,
      note_type: 'Individual Addendum',
      content: content.trim(),
      created_by: createdBy,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function listGroupSessions() {
  const { data, error } = await supabase
    .from('program_sessions')
    .select(SESSION_COLUMNS)
    .not('group_note', 'is', null)
    .order('session_date', { ascending: false })
  if (error) throw error
  return data
}

// All group sessions with their shared note plus a participant count, for
// the Group Note Report - a cross-session view of every group note ever
// written, independent of which program or whether it was a camp.
export async function listGroupNoteReport() {
  const sessions = await listGroupSessions()
  if (sessions.length === 0) return []

  const sessionIds = sessions.map((s) => s.id)
  const { data: attendance, error } = await supabase.from('attendance').select('session_id').in('session_id', sessionIds)
  if (error) throw error

  const countBySession = {}
  for (const record of attendance) {
    countBySession[record.session_id] = (countBySession[record.session_id] ?? 0) + 1
  }

  return sessions.map((s) => ({ ...s, participantCount: countBySession[s.id] ?? 0 }))
}

export async function listSessionAttendance(sessionId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, client:clients(id, first_name, last_name)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}
