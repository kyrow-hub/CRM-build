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

// Includes inactive programs too, for the admin/manager Manage Programs
// list - listPrograms() stays active-only since it backs dropdown pickers
// everywhere else.
export async function listAllPrograms() {
  const { data, error } = await supabase.from('programs').select('*').order('name')
  if (error) throw error
  return data
}

export async function updateProgram(id, input) {
  if (!input.name?.trim()) throw new Error('Program name is required.')
  const { data, error } = await supabase.from('programs').update(input).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

// Cascades to that program's sessions, attendance, roster, and any
// uploaded risk assessment documents (see migrations 0001, 0026, 0023) -
// deactivating (editing "Active" to off) is almost always the safer
// choice; this is for genuine duplicates/mistakes.
export async function deleteProgram(id) {
  const { error } = await supabase.from('programs').delete().eq('id', id)
  if (error) throw error
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
