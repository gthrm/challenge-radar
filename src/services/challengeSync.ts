import type { Challenge } from '../types/challenge'
import { supabase } from './supabaseClient'

const TABLE = 'challenges'

export const supabaseAvailable = Boolean(supabase)

export const fetchRemoteChallenges = async (): Promise<Challenge[]> => {
  if (!supabase) return []
  const { data, error } = await supabase.from(TABLE).select('*').order('updated_at', { ascending: false })
  if (error) {
    console.warn('Supabase fetch error', error)
    return []
  }
  return (data ?? []).map(deserialize)
}

export const upsertChallenge = async (challenge: Challenge, userId: string) => {
  if (!supabase) return
  const { error } = await supabase.from(TABLE).upsert(serialize(challenge, userId))
  if (error) console.warn('Supabase upsert error', error)
}

export const deleteChallenge = async (id: string) => {
  if (!supabase) return
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) console.warn('Supabase delete error', error)
}

const serialize = (challenge: Challenge, userId: string) => ({
  id: challenge.id,
  user_id: userId,
  title: challenge.title,
  description: challenge.description ?? null,
  start_date: challenge.startDate,
  total_days: challenge.totalDays,
  reminder_time: challenge.reminderTime,
  reminders_on: challenge.remindersOn,
  entries: challenge.entries,
  last_notified: challenge.lastNotified ?? null,
})

const deserialize = (row: any): Challenge => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  startDate: row.start_date,
  totalDays: row.total_days,
  reminderTime: row.reminder_time,
  remindersOn: row.reminders_on,
  entries: row.entries ?? {},
  lastNotified: row.last_notified ?? undefined,
})
