import { supabase } from '../lib/supabase.js'

const REFERRAL_COLUMNS = '*, client:clients(id, first_name, last_name)'

export async function listReferrals({ search = '', status = '' } = {}) {
  let query = supabase.from('referrals').select(REFERRAL_COLUMNS).order('date_received', { ascending: false })

  if (search.trim()) {
    const term = search.trim()
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,referral_source.ilike.%${term}%,referred_by.ilike.%${term}%`,
    )
  }
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createReferral(input) {
  if (!input.first_name?.trim()) throw new Error('First name is required.')
  if (!input.last_name?.trim()) throw new Error('Last name is required.')
  const { data, error } = await supabase.from('referrals').insert(input).select(REFERRAL_COLUMNS).single()
  if (error) throw error
  return data
}

export async function updateReferral(id, input) {
  const { data, error } = await supabase.from('referrals').update(input).eq('id', id).select(REFERRAL_COLUMNS).single()
  if (error) throw error
  return data
}

export async function listReferralsForClient(clientId) {
  const { data, error } = await supabase
    .from('referrals')
    .select(REFERRAL_COLUMNS)
    .eq('client_id', clientId)
    .order('date_received', { ascending: false })
  if (error) throw error
  return data
}

export async function countReferralsByStatus() {
  const { data, error } = await supabase.from('referrals').select('status')
  if (error) throw error
  return data.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})
}
