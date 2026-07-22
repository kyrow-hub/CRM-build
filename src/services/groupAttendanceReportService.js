import { supabase } from '../lib/supabase.js'

// A full attendance roster per session (not just camps, not just sessions
// with a group note) - every session that has at least one attendance
// record, with every participant and their status, for compliance/audit
// style reporting and export.
export async function getGroupAttendanceReport() {
  const [sessionsResult, attendanceResult] = await Promise.all([
    supabase
      .from('program_sessions')
      .select('id, session_date, location, activity_type, overnight_camp, program:programs(id, name)')
      .order('session_date', { ascending: false }),
    supabase
      .from('attendance')
      .select('id, session_id, client_id, attendance_status, client:clients(id, first_name, last_name)'),
  ])
  if (sessionsResult.error) throw sessionsResult.error
  if (attendanceResult.error) throw attendanceResult.error

  const sessions = sessionsResult.data
  const attendance = attendanceResult.data

  const attendanceBySession = {}
  for (const record of attendance) {
    if (!attendanceBySession[record.session_id]) attendanceBySession[record.session_id] = []
    attendanceBySession[record.session_id].push(record)
  }

  const sessionsWithAttendance = sessions
    .map((session) => ({ ...session, records: attendanceBySession[session.id] ?? [] }))
    .filter((session) => session.records.length > 0)

  const presentCount = attendance.filter((a) => a.attendance_status === 'Present').length
  const distinctParticipants = new Set(attendance.map((a) => a.client_id)).size

  return {
    sessions: sessionsWithAttendance,
    totalSessions: sessionsWithAttendance.length,
    totalRecords: attendance.length,
    presentCount,
    distinctParticipants,
  }
}
