import { supabase } from '../lib/supabase.js'

function clientName(client) {
  return client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : 'a client'
}

function getWeekRange() {
  const now = new Date()
  const diffToMonday = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - diffToMonday)
  const nextMonday = new Date(monday)
  nextMonday.setDate(monday.getDate() + 7)
  return { start: monday.toISOString().slice(0, 10), end: nextMonday.toISOString().slice(0, 10) }
}

export async function getDashboardStats() {
  const { start, end } = getWeekRange()
  const today = new Date().toISOString().slice(0, 10)

  const [clientsResult, leadsResult, referralsWeekResult, meetingsWeekResult, reviewsOverdueResult] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active').is('archived_at', null),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('referrals').select('id', { count: 'exact', head: true }).gte('date_received', start).lt('date_received', end),
    supabase.from('meetings').select('id', { count: 'exact', head: true }).gte('meeting_date', start).lt('meeting_date', end),
    supabase.from('clients').select('id', { count: 'exact', head: true }).lt('next_review_date', today).is('archived_at', null),
  ])
  for (const result of [clientsResult, leadsResult, referralsWeekResult, meetingsWeekResult, reviewsOverdueResult]) {
    if (result.error) throw result.error
  }

  return {
    activeClients: clientsResult.count ?? 0,
    totalLeads: leadsResult.count ?? 0,
    referralsThisWeek: referralsWeekResult.count ?? 0,
    meetingsThisWeek: meetingsWeekResult.count ?? 0,
    reviewsOverdue: reviewsOverdueResult.count ?? 0,
  }
}

// Pulls the most recent items from across the system into one unified,
// time-sorted feed - there's no single "activity" table, so this composes
// several small recent queries instead of one join.
export async function getRecentActivity(limit = 12) {
  const perTableLimit = limit
  const [notesResult, activitiesResult, meetingsResult, referralsResult, outcomesResult, storiesResult] =
    await Promise.all([
      supabase
        .from('client_notes')
        .select('id, note_type, created_at, client:clients(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(perTableLimit),
      supabase
        .from('case_activities')
        .select('id, activity_type, created_at, client:clients(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(perTableLimit),
      supabase
        .from('meetings')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(perTableLimit),
      supabase
        .from('referrals')
        .select('id, first_name, last_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(perTableLimit),
      supabase
        .from('client_outcomes')
        .select('id, category, outcome_type, created_at, client:clients(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(perTableLimit),
      supabase
        .from('good_news_stories')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(perTableLimit),
    ])
  for (const result of [notesResult, activitiesResult, meetingsResult, referralsResult, outcomesResult, storiesResult]) {
    if (result.error) throw result.error
  }

  const items = []
  for (const n of notesResult.data) {
    items.push({
      id: `note-${n.id}`,
      type: 'Case Note',
      description: `${n.note_type || 'Note'} logged for ${clientName(n.client)}`,
      date: n.created_at,
    })
  }
  for (const a of activitiesResult.data) {
    items.push({
      id: `activity-${a.id}`,
      type: 'Case Activity',
      description: `${a.activity_type} logged for ${clientName(a.client)}`,
      date: a.created_at,
    })
  }
  for (const m of meetingsResult.data) {
    items.push({ id: `meeting-${m.id}`, type: 'Meeting', description: `Meeting scheduled: ${m.title}`, date: m.created_at })
  }
  for (const r of referralsResult.data) {
    items.push({
      id: `referral-${r.id}`,
      type: 'Referral',
      description: `Referral ${r.status.toLowerCase()} for ${[r.first_name, r.last_name].filter(Boolean).join(' ')}`,
      date: r.created_at,
    })
  }
  for (const o of outcomesResult.data) {
    items.push({
      id: `outcome-${o.id}`,
      type: 'Outcome',
      description: `${o.category} outcome recorded for ${clientName(o.client)}`,
      date: o.created_at,
    })
  }
  for (const s of storiesResult.data) {
    items.push({ id: `story-${s.id}`, type: 'Good News', description: `Good news story: ${s.title}`, date: s.created_at })
  }

  items.sort((a, b) => new Date(b.date) - new Date(a.date))
  return items.slice(0, limit)
}
