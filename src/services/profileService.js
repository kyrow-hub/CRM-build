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

// Re-authenticates with the current password first so a stale/unattended
// session can't be used to silently take over the account, then updates it.
export async function changeOwnPassword(email, currentPassword, newPassword) {
  if (!currentPassword) throw new Error('Enter your current password.')
  if (newPassword.length < 6) throw new Error('New password must be at least 6 characters.')

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
  if (reauthError) throw new Error('Current password is incorrect.')

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// Used from the /reset-password page after a user follows a "forgot
// password" email link, which authenticates them with a short-lived
// recovery session (no current password to verify).
export async function completePasswordReset(newPassword) {
  if (newPassword.length < 6) throw new Error('New password must be at least 6 characters.')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
