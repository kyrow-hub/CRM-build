import { supabase } from '../lib/supabase.js'

const MEETING_COLUMNS =
  '*, client:clients(id, first_name, last_name), partner:partners(id, business_name)'

export async function listMeetings({ search = '', status = '', meetingType = '' } = {}) {
  let query = supabase
    .from('meetings')
    .select(MEETING_COLUMNS)
    .order('meeting_date', { ascending: false })

  if (search.trim()) {
    const term = search.trim()
    query = query.or(`title.ilike.%${term}%,location.ilike.%${term}%`)
  }
  if (status) query = query.eq('status', status)
  if (meetingType) query = query.eq('meeting_type', meetingType)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createMeeting(input) {
  if (!input.title?.trim()) throw new Error('Meeting title is required.')
  if (!input.meeting_date) throw new Error('Meeting date is required.')
  const { data, error } = await supabase.from('meetings').insert(input).select(MEETING_COLUMNS).single()
  if (error) throw error
  return data
}

export async function updateMeetingStatus(id, status) {
  const { data, error } = await supabase
    .from('meetings')
    .update({ status })
    .eq('id', id)
    .select(MEETING_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function updateMeeting(id, input) {
  if (!input.title?.trim()) throw new Error('Meeting title is required.')
  if (!input.meeting_date) throw new Error('Meeting date is required.')
  const { data, error } = await supabase.from('meetings').update(input).eq('id', id).select(MEETING_COLUMNS).single()
  if (error) throw error
  return data
}

export async function deleteMeeting(id) {
  const { error } = await supabase.from('meetings').delete().eq('id', id)
  if (error) throw error
}
