import { supabase } from '../lib/supabase.js'

function clientName(client) {
  return client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : '—'
}

// Pulls together everything for an overnight camp report from existing
// tables - program_sessions flagged overnight_camp, their attendance,
// any client_notes tied to those sessions (individual + group-session
// notes), and client_outcomes logged under the "Camp" category. No new
// schema needed.
export async function getCampReport() {
  const { data: campSessions, error: sessionsError } = await supabase
    .from('program_sessions')
    .select('id, session_date, location, group_note, program:programs(id, name)')
    .eq('overnight_camp', true)
    .order('session_date', { ascending: false })
  if (sessionsError) throw sessionsError

  const sessionIds = campSessions.map((s) => s.id)
  if (sessionIds.length === 0) {
    return {
      sessions: [],
      totalCamps: 0,
      totalParticipants: 0,
      totalAttendanceRecords: 0,
      repeatCampers: [],
      notes: [],
      outcomes: [],
    }
  }

  const [attendanceResult, notesResult, outcomesResult] = await Promise.all([
    supabase
      .from('attendance')
      .select('id, session_id, client_id, attendance_status, client:clients(id, first_name, last_name)')
      .in('session_id', sessionIds),
    supabase
      .from('client_notes')
      .select('id, client_id, session_id, content, is_group_note, note_date, client:clients(id, first_name, last_name)')
      .in('session_id', sessionIds)
      .order('note_date', { ascending: false }),
    supabase
      .from('client_outcomes')
      .select('id, client_id, outcome_type, outcome_date, notes, client:clients(id, first_name, last_name)')
      .eq('category', 'Camp')
      .order('outcome_date', { ascending: false }),
  ])
  for (const result of [attendanceResult, notesResult, outcomesResult]) {
    if (result.error) throw result.error
  }
  const attendance = attendanceResult.data
  const notes = notesResult.data
  const outcomes = outcomesResult.data

  const sessionCountByClient = {}
  const distinctParticipants = new Set()
  for (const record of attendance) {
    distinctParticipants.add(record.client_id)
    sessionCountByClient[record.client_id] = (sessionCountByClient[record.client_id] ?? 0) + 1
  }

  const repeatCampers = Object.entries(sessionCountByClient)
    .filter(([, count]) => count > 1)
    .map(([clientId, count]) => {
      const record = attendance.find((a) => a.client_id === clientId)
      return { clientId, name: clientName(record?.client), campsAttended: count }
    })
    .sort((a, b) => b.campsAttended - a.campsAttended)

  const sessions = campSessions.map((session) => {
    const sessionAttendance = attendance.filter((a) => a.session_id === session.id)
    return {
      id: session.id,
      programName: session.program?.name ?? 'Program',
      sessionDate: session.session_date,
      location: session.location,
      groupNote: session.group_note,
      participantCount: sessionAttendance.length,
    }
  })

  return {
    sessions,
    totalCamps: campSessions.length,
    totalParticipants: distinctParticipants.size,
    totalAttendanceRecords: attendance.length,
    repeatCampers,
    notes,
    outcomes,
  }
}
