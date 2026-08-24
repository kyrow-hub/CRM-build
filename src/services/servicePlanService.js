import { supabase } from '../lib/supabase.js'

const PLAN_ITEM_COLUMNS = '*, worker:profiles!responsible_worker(id, first_name, last_name)'

export async function listServicePlanItems(clientId) {
  const { data, error } = await supabase
    .from('client_service_plan_items')
    .select(PLAN_ITEM_COLUMNS)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createServicePlanItem(input) {
  if (!input.service_type?.trim()) throw new Error('Service type is required.')
  const { data, error } = await supabase
    .from('client_service_plan_items')
    .insert(input)
    .select(PLAN_ITEM_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function listAllServicePlanItems() {
  const { data, error } = await supabase.from('client_service_plan_items').select('client_id, service_type, status')
  if (error) throw error
  return data
}

export async function updateServicePlanItemStatus(id, status) {
  const { data, error } = await supabase
    .from('client_service_plan_items')
    .update({ status })
    .eq('id', id)
    .select(PLAN_ITEM_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function updateServicePlanItem(id, input) {
  if (!input.service_type?.trim()) throw new Error('Service type is required.')
  const { data, error } = await supabase
    .from('client_service_plan_items')
    .update(input)
    .eq('id', id)
    .select(PLAN_ITEM_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function deleteServicePlanItem(id) {
  const { error } = await supabase.from('client_service_plan_items').delete().eq('id', id)
  if (error) throw error
}
