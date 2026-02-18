export type Challenge = {
  id: string
  title: string
  description?: string
  startDate: string // YYYY-MM-DD
  totalDays: number
  reminderTime: string // HH:MM
  remindersOn: boolean
  entries: Record<string, boolean>
  lastNotified?: string // YYYY-MM-DD
  updatedAt?: string // ISO string
}

export type FormState = {
  title: string
  description: string
  startDate: string
  totalDays: number
  reminderTime: string
  remindersOn: boolean
}

export type Filter = 'today' | 'active' | 'completed' | 'upcoming' | 'all'

export type Stats = {
  total: number
  active: number
  completed: number
  completionRate: number
  checkIns: number
}

export type Progress = {
  done: number
  expected: number
  percent: number
  status: 'completed' | 'behind' | 'on-track'
}

export type MergeConflict = {
  local: Challenge[]
  remote: Challenge[]
}
