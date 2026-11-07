import type { ISODate, ScheduleVersion, WorkoutSession } from '../types'
import { addDays, daysOfMonth, startOfWeek, weekday } from './dates'

export interface History {
  sessions: WorkoutSession[]
  schedules: ScheduleVersion[]
  startDate: ISODate
  today: ISODate
}

export type DayStatus = 'done' | 'rest' | 'missed' | 'today' | 'upcoming' | 'none'

/** A day counts as active once at least one exercise of a finished session was done. */
export const activeDays = (sessions: WorkoutSession[]) =>
  new Set(sessions.filter((s) => s.exercisesCompleted > 0).map((s) => s.date))

/** The workout scheduled on a date, using the schedule that was in force then. */
export function plannedFor(date: ISODate, schedules: ScheduleVersion[]): string | null {
  if (!schedules.length) return null
  const sorted = [...schedules].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
  let current = sorted[0]
  for (const s of sorted) if (s.effectiveFrom <= date) current = s
  return current.days[weekday(date)]
}

export function dayStatus(date: ISODate, h: History, active = activeDays(h.sessions)): DayStatus {
  if (active.has(date)) return 'done'
  if (date < h.startDate) return 'none'
  if (plannedFor(date, h.schedules) === null) return 'rest'
  if (date > h.today) return 'upcoming'
  if (date === h.today) return 'today'
  return 'missed'
}

/** Consecutive workout days. Rest days and today (not yet done) don't break it; a missed scheduled day does. */
export function currentStreak(h: History): number {
  const active = activeDays(h.sessions)
  const first = earliest(h, active)
  let n = 0
  for (let d = h.today; d >= first; d = addDays(d, -1)) {
    const s = dayStatus(d, h, active)
    if (s === 'done') n++
    else if (s === 'missed') break
  }
  return n
}

export function longestStreak(h: History, from?: ISODate, to: ISODate = h.today): number {
  const active = activeDays(h.sessions)
  let best = 0
  let run = 0
  for (let d = from ?? earliest(h, active); d <= to; d = addDays(d, 1)) {
    const s = dayStatus(d, h, active)
    if (s === 'done') best = Math.max(best, ++run)
    else if (s === 'missed') run = 0
  }
  return best
}

function earliest(h: History, active: Set<ISODate>): ISODate {
  let first = h.startDate
  for (const d of active) if (d < first) first = d
  return first
}

export interface PeriodStats {
  days: { date: ISODate; status: DayStatus; minutes: number }[]
  workouts: number
  activeDays: number
  scheduled: number // scheduled training days up to today
  scheduledDone: number
  minutes: number
  consistency: number // 0–100
}

function stats(dates: ISODate[], h: History): PeriodStats {
  const active = activeDays(h.sessions)
  const inRange = h.sessions.filter((s) => s.date >= dates[0] && s.date <= dates[dates.length - 1])
  const days = dates.map((date) => ({
    date,
    status: dayStatus(date, h, active),
    minutes: Math.round(inRange.filter((s) => s.date === date).reduce((t, s) => t + s.duration, 0) / 60),
  }))
  let scheduled = 0
  let scheduledDone = 0
  for (const d of days) {
    if (d.date < h.startDate || d.date > h.today || plannedFor(d.date, h.schedules) === null) continue
    // Today only counts against you once it's done; until then it's still possible.
    if (d.date === h.today && d.status !== 'done') continue
    scheduled++
    if (d.status === 'done') scheduledDone++
  }
  return {
    days,
    workouts: inRange.length,
    activeDays: days.filter((d) => d.status === 'done').length,
    scheduled,
    scheduledDone,
    minutes: days.reduce((t, d) => t + d.minutes, 0),
    consistency: scheduled ? Math.round((scheduledDone / scheduled) * 100) : 0,
  }
}

export const weekStats = (date: ISODate, h: History) =>
  stats(Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i)), h)

export function monthStats(key: string, h: History) {
  const dates = daysOfMonth(key)
  const end = dates[dates.length - 1] < h.today ? dates[dates.length - 1] : h.today
  const s = stats(dates, h)
  return { ...s, longestStreak: dates[0] > h.today ? 0 : longestStreak(h, dates[0], end) }
}
