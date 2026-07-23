import { supabase } from '../lib/supabase.js'

export async function listPrograms() {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('active', true)
    .order('name')
  if (error) throw error
  return data
}

// Every overnight camp session (regardless of whether a group note has
// been written yet), so the Risk Assessments panel can show which camps
// still need an uploaded risk assessment.
export async function listCampSessions() {
  const { data, error } = await supabase
    .from('program_sessions')
    .select('id, session_date, location, program:programs(id, name)')
    .eq('overnight_camp', true)
    .order('session_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createProgram(input) {
  if (!input.name?.trim()) throw new Error('Program name is required.')
  const { data, error } = await supabase.from('programs').insert(input).select('*').single()
  if (error) throw error
  return data
}

// There's no separate "enrollment" record - a client's involvement with a
// program is derived from their attendance history at that program's
// sessions, grouped into one summary row per program.
export async function getClientProgramSummary(clientId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, attendance_status, session:program_sessions(id, session_date, program:programs(id, name, location))')
    .eq('client_id', clientId)
  if (error) throw error

  const byProgram = {}
  for (const record of data) {
    const program = record.session?.program
    if (!program) continue
    if (!byProgram[program.id]) {
      byProgram[program.id] = {
        id: program.id,
        name: program.name,
        location: program.location,
        sessionsAttended: 0,
        presentCount: 0,
        firstDate: record.session.session_date,
        lastDate: record.session.session_date,
      }
    }
    const entry = byProgram[program.id]
    entry.sessionsAttended += 1
    if (record.attendance_status === 'Present') entry.presentCount += 1
    if (record.session.session_date < entry.firstDate) entry.firstDate = record.session.session_date
    if (record.session.session_date > entry.lastDate) entry.lastDate = record.session.session_date
  }

  return Object.values(byProgram).sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1))
}
