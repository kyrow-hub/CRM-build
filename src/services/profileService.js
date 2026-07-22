import { supabase } from '../lib/supabase.js'

export async function listProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').order('first_name')
  if (error) throw error
  return data
}

// Only ever sends the fields a user is allowed to change on their own
// row - role/active are guarded server-side by a trigger regardless, but
// this also keeps the intent obvious here.
export async function updateOwnProfile(userId, { first_name, last_name, phone }) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ first_name, last_name, phone })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProfileRole(profileId, role) {
  const { data, error } = await supabase.from('profiles').update({ role }).eq('id', profileId).select().single()
  if (error) throw error
  return data
}

export async function updateProfileActive(profileId, active) {
  const { data, error } = await supabase.from('profiles').update({ active }).eq('id', profileId).select().single()
  if (error) throw error
  return data
}
