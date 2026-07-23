import { supabase } from '../lib/supabase.js'

const LEAD_COLUMNS = '*, assigned_worker:profiles!assigned_worker_id(id, first_name, last_name)'

export async function listLeads({ search = '', status = '' } = {}) {
  let query = supabase.from('leads').select(LEAD_COLUMNS).order('created_at', { ascending: false })

  if (search.trim()) {
    const term = search.trim()
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%,source.ilike.%${term}%`,
    )
  }
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createLead(input) {
  if (!input.first_name?.trim()) throw new Error('First name is required.')
  if (!input.last_name?.trim()) throw new Error('Last name is required.')
  const { data, error } = await supabase.from('leads').insert(input).select(LEAD_COLUMNS).single()
  if (error) throw error
  return data
}

export async function updateLead(id, input) {
  if (!input.first_name?.trim()) throw new Error('First name is required.')
  if (!input.last_name?.trim()) throw new Error('Last name is required.')
  const { data, error } = await supabase.from('leads').update(input).eq('id', id).select(LEAD_COLUMNS).single()
  if (error) throw error
  return data
}

export async function deleteLead(id) {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}
