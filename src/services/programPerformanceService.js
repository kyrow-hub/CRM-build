import { supabase } from '../lib/supabase.js'

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Aggregates programs/program_sessions/attendance into a per-program
// performance summary - sessions run, camps run, total and repeat
// attendance, average attendance per session, and hours delivered. All
// derived client-side from existing tables, no new schema needed.
export async function getProgramPerformance() {
  const [programsResult, sessionsResult, attendanceResult] = await Promise.all([
    supabase.from('programs').select('id, name, active'),
    supabase.from('program_sessions').select('id, program_id, start_time, end_time, overnight_camp'),
    supabase.from('attendance').select('session_id, client_id, attendance_status'),
  ])
  for (const result of [programsResult, sessionsResult, attendanceResult]) {
    if (result.error) throw result.error
  }

  const programs = programsResult.data
  const sessions = sessionsResult.data
  const attendance = attendanceResult.data

  return programs
    .map((program) => {
      const programSessions = sessions.filter((s) => s.program_id === program.id)
      const sessionIds = new Set(programSessions.map((s) => s.id))
      const programAttendance = attendance.filter((a) => sessionIds.has(a.session_id))

      let totalMinutes = 0
      for (const session of programSessions) {
        if (session.start_time && session.end_time) {
          const minutes = timeToMinutes(session.end_time) - timeToMinutes(session.start_time)
          if (minutes > 0) totalMinutes += minutes
        }
      }

      const participantCounts = {}
      for (const record of programAttendance) {
        participantCounts[record.client_id] = (participantCounts[record.client_id] ?? 0) + 1
      }
      const distinctParticipants = Object.keys(participantCounts).length
      const repeatParticipants = Object.values(participantCounts).filter((c) => c > 1).length
      const campSessions = programSessions.filter((s) => s.overnight_camp).length
      const presentCount = programAttendance.filter((a) => a.attendance_status === 'Present').length

      return {
        id: program.id,
        name: program.name,
        active: program.active,
        sessionCount: programSessions.length,
        campSessions,
        totalAttendance: programAttendance.length,
        distinctParticipants,
        repeatParticipants,
        avgAttendance: programSessions.length ? programAttendance.length / programSessions.length : 0,
        hours: totalMinutes / 60,
        attendanceRate: programAttendance.length ? presentCount / programAttendance.length : null,
      }
    })
    .sort((a, b) => b.totalAttendance - a.totalAttendance)
}
