import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// `supabase` is null when the app hasn't been configured yet. Callers that
// run before the configuration check (e.g. AuthProvider) must not be
// reached in that case - see src/main.jsx, which renders a setup screen
// instead of the app when isSupabaseConfigured is false.
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null
