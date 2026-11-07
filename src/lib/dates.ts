import type { ISODate } from '../types'

export const toISO = (d: Date): ISODate =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const fromISO = (s: ISODate): Date => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const today = (): ISODate => toISO(new Date())

export const addDays = (s: ISODate, n: number): ISODate => {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** 0 = Monday … 6 = Sunday */
export const weekday = (s: ISODate): number => (fromISO(s).getDay() + 6) % 7

export const startOfWeek = (s: ISODate): ISODate => addDays(s, -weekday(s))

export const monthKey = (s: ISODate) => s.slice(0, 7) // 'YYYY-MM'

export function daysOfMonth(key: string): ISODate[] {
  const [y, m] = key.split('-').map(Number)
  const n = new Date(y, m, 0).getDate()
  return Array.from({ length: n }, (_, i) => `${key}-${String(i + 1).padStart(2, '0')}`)
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const formatLong = (s: ISODate) =>
  fromISO(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

export const formatShort = (s: ISODate) =>
  fromISO(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatMonth = (key: string) =>
  fromISO(`${key}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

export function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  if (m < 1) return `${Math.round(secs)} sec`
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

export const clock = (secs: number) => {
  const s = Math.max(0, Math.round(secs))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
