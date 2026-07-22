import { supabase } from '../lib/supabase.js'

export async function listClientRelationships(clientId) {
  const { data, error } = await supabase
    .from('client_relationships')
    .select('*')
    .eq('client_id', clientId)
    .order('is_primary_contact', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function listAllRelationships() {
  const { data, error } = await supabase.from('client_relationships').select('client_id, relationship_type, is_primary_contact')
  if (error) throw error
  return data
}

export async function createRelationship(input) {
  if (!input.relationship_type?.trim()) throw new Error('Relationship is required.')
  if (!input.full_name?.trim()) throw new Error('Name is required.')
  const { data, error } = await supabase.from('client_relationships').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function updateRelationship(id, input) {
  const { data, error } = await supabase
    .from('client_relationships')
    .update(input)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteRelationship(id) {
  const { error } = await supabase.from('client_relationships').delete().eq('id', id)
  if (error) throw error
}
