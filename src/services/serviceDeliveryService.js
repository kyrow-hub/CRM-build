import { supabase } from '../lib/supabase.js'

const DELIVERY_COLUMNS = '*, author:profiles!created_by(id, first_name, last_name)'

export async function listClientServiceDeliveries(clientId) {
  const { data, error } = await supabase
    .from('service_deliveries')
    .select(DELIVERY_COLUMNS)
    .eq('client_id', clientId)
    .order('delivery_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createServiceDelivery(input) {
  if (!input.service_type?.trim()) throw new Error('Service type is required.')
  const { data, error } = await supabase.from('service_deliveries').insert(input).select(DELIVERY_COLUMNS).single()
  if (error) throw error
  return data
}

export async function countServiceDeliveries() {
  const { count, error } = await supabase.from('service_deliveries').select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function listAllServiceDeliveries(limit = 50) {
  const { data, error } = await supabase
    .from('service_deliveries')
    .select('*, client:clients(id, first_name, last_name)')
    .order('delivery_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function countServiceDeliveriesByType() {
  const { data, error } = await supabase.from('service_deliveries').select('service_type, quantity')
  if (error) throw error
  return data.reduce((acc, r) => {
    acc[r.service_type] = (acc[r.service_type] ?? 0) + (r.quantity ?? 1)
    return acc
  }, {})
}
