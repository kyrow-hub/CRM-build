import { supabase } from '../lib/supabase.js'

const STORY_COLUMNS = '*, client:clients(id, first_name, last_name), program:programs(id, name)'

export async function listGoodNewsStories() {
  const { data, error } = await supabase
    .from('good_news_stories')
    .select(STORY_COLUMNS)
    .order('story_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createGoodNewsStory(input) {
  if (!input.title?.trim()) throw new Error('Title is required.')
  if (!input.story?.trim()) throw new Error('Story text is required.')
  const { data, error } = await supabase.from('good_news_stories').insert(input).select(STORY_COLUMNS).single()
  if (error) throw error
  return data
}

export async function updateGoodNewsStory(id, input) {
  if (!input.title?.trim()) throw new Error('Title is required.')
  if (!input.story?.trim()) throw new Error('Story text is required.')
  const { data, error } = await supabase.from('good_news_stories').update(input).eq('id', id).select(STORY_COLUMNS).single()
  if (error) throw error
  return data
}

export async function deleteGoodNewsStory(id) {
  const { error } = await supabase.from('good_news_stories').delete().eq('id', id)
  if (error) throw error
}

export async function countGoodNewsStories() {
  const { count, error } = await supabase.from('good_news_stories').select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}
