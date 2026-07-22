import { supabase } from '../lib/supabase.js'

// Distinct clients with at least one recorded touchpoint (attendance, case
// note, case activity, or outcome) - a reasonable all-time "supported"
// count, separate from just counting every client record ever created.
export async function getEngagedClientCount() {
  const [attendance, notes, activities, outcomes] = await Promise.all([
    supabase.from('attendance').select('client_id'),
    supabase.from('client_notes').select('client_id'),
    supabase.from('case_activities').select('client_id'),
    supabase.from('client_outcomes').select('client_id'),
  ])
  for (const result of [attendance, notes, activities, outcomes]) {
    if (result.error) throw result.error
  }
  const ids = new Set()
  attendance.data.forEach((r) => ids.add(r.client_id))
  notes.data.forEach((r) => ids.add(r.client_id))
  activities.data.forEach((r) => ids.add(r.client_id))
  outcomes.data.forEach((r) => ids.add(r.client_id))
  return ids.size
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Hours delivered is derived from program_sessions with both a start and
// end time set - sessions logged without times aren't counted, since there
// is nothing to calculate a duration from.
export async function getProgramHoursStats() {
  const { data, error } = await supabase.from('program_sessions').select('start_time, end_time')
  if (error) throw error

  let totalMinutes = 0
  let sessionsWithDuration = 0
  for (const session of data) {
    if (session.start_time && session.end_time) {
      const minutes = timeToMinutes(session.end_time) - timeToMinutes(session.start_time)
      if (minutes > 0) {
        totalMinutes += minutes
        sessionsWithDuration += 1
      }
    }
  }
  return { totalHours: totalMinutes / 60, sessionsWithDuration, totalSessions: data.length }
}

export async function getAttendanceStats() {
  const { data, error } = await supabase.from('attendance').select('attendance_status, client_id')
  if (error) throw error

  const statusCounts = {}
  const distinctClients = new Set()
  for (const record of data) {
    statusCounts[record.attendance_status] = (statusCounts[record.attendance_status] ?? 0) + 1
    distinctClients.add(record.client_id)
  }
  return { statusCounts, total: data.length, distinctClients: distinctClients.size }
}

export async function getGoalStatusCounts() {
  const { data, error } = await supabase.from('client_goals').select('status')
  if (error) throw error
  return data.reduce((acc, g) => {
    acc[g.status] = (acc[g.status] ?? 0) + 1
    return acc
  }, {})
}
