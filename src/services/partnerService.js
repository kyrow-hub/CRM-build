import { supabase } from '../lib/supabase.js'

const PARTNER_COLUMNS = '*, contacts:partner_contacts(*)'

export async function listPartners(search = '') {
  let query = supabase.from('partners').select(PARTNER_COLUMNS).order('business_name', { ascending: true })

  if (search.trim()) {
    const term = search.trim()
    query = query.or(`business_name.ilike.%${term}%,address.ilike.%${term}%,email.ilike.%${term}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPartnerById(id) {
  const { data, error } = await supabase.from('partners').select(PARTNER_COLUMNS).eq('id', id).single()
  if (error) throw error
  return data
}

export async function createPartner(input) {
  if (!input.business_name?.trim()) throw new Error('Business name is required.')
  const { data, error } = await supabase.from('partners').insert(input).select(PARTNER_COLUMNS).single()
  if (error) throw error
  return data
}

export async function addPartnerContact(partnerId, input) {
  if (!input.name?.trim()) throw new Error('Contact name is required.')
  const { data, error } = await supabase
    .from('partner_contacts')
    .insert({ ...input, partner_id: partnerId })
    .select()
    .single()
  if (error) throw error
  return data
}
