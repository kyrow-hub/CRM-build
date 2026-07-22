import { supabase } from '../lib/supabase.js'

export async function listPrograms() {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('active', true)
    .order('name')
  if (error) throw error
  return data
}

export async function createProgram(input) {
  if (!input.name?.trim()) throw new Error('Program name is required.')
  const { data, error } = await supabase.from('programs').insert(input).select('*').single()
  if (error) throw error
  return data
}
