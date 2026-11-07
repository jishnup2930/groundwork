import type { AppSettings, ScheduleVersion, UserProfile, WeightEntry, Workout, WorkoutSession } from '../types'
import { db, SCHEMA_VERSION } from './db'
import { getPrefs, migratePrefs, setPrefs } from './prefs'

export interface Backup {
  app: 'groundwork'
  version: number
  exportedAt: string
  profile: UserProfile | null
  sessions: WorkoutSession[]
  weights: WeightEntry[]
  customWorkouts: Workout[]
  schedules: ScheduleVersion[]
  settings: AppSettings
}

export async function exportData(): Promise<Backup> {
  const [profile, sessions, weights, customWorkouts, schedules] = await Promise.all([
    db.profile.get('me'), db.sessions.toArray(), db.weights.toArray(), db.customWorkouts.toArray(), db.schedules.toArray(),
  ])
  return {
    app: 'groundwork', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(),
    profile: profile ?? null, sessions, weights, customWorkouts, schedules, settings: getPrefs(),
  }
}

const isArr = (v: unknown, check: (x: Record<string, unknown>) => boolean) =>
  Array.isArray(v) && v.every((x) => x && typeof x === 'object' && check(x as Record<string, unknown>))
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** Validate untrusted JSON before it gets anywhere near the database. Throws a readable message. */
export function parseBackup(text: string): Backup {
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('This file isn’t valid JSON. Choose a file exported from Groundwork.')
  }
  if (!raw || raw.app !== 'groundwork') throw new Error('This file wasn’t exported from Groundwork.')
  if (typeof raw.version !== 'number' || raw.version > SCHEMA_VERSION)
    throw new Error('This backup comes from a newer version of Groundwork. Update the app, then try again.')
  const p = raw.profile as Record<string, unknown> | null
  const ok =
    (p === null || (typeof p === 'object' && typeof p.name === 'string' && typeof p.heightCm === 'number' && isDate(p.startDate))) &&
    isArr(raw.sessions, (s) => typeof s.id === 'string' && isDate(s.date) && typeof s.duration === 'number' && typeof s.exercisesCompleted === 'number') &&
    isArr(raw.weights, (w) => isDate(w.date) && typeof w.weightKg === 'number' && (w.weightKg as number) > 0) &&
    isArr(raw.customWorkouts, (w) => typeof w.id === 'string' && typeof w.name === 'string' && Array.isArray(w.exercises)) &&
    isArr(raw.schedules, (s) => isDate(s.effectiveFrom) && Array.isArray(s.days) && (s.days as unknown[]).length === 7)
  if (!ok) throw new Error('Some records in this file are damaged or incomplete, so nothing was imported.')
  // Only accept an embedded image as the avatar, never a link the app would fetch.
  if (p && p.avatar !== undefined && !(typeof p.avatar === 'string' && /^data:image\/(webp|png|jpeg);base64,/.test(p.avatar))) delete p.avatar
  return raw as unknown as Backup
}

/** Replaces everything on this device with the backup. Callers must confirm with the user first. */
export async function importData(b: Backup) {
  await db.transaction('rw', [db.profile, db.sessions, db.weights, db.customWorkouts, db.schedules], async () => {
    await Promise.all([db.profile.clear(), db.sessions.clear(), db.weights.clear(), db.customWorkouts.clear(), db.schedules.clear()])
    if (b.profile) await db.profile.put({ ...b.profile, id: 'me' })
    await db.sessions.bulkPut(b.sessions)
    await db.weights.bulkPut(b.weights)
    await db.customWorkouts.bulkPut(b.customWorkouts)
    await db.schedules.bulkPut(b.schedules)
  })
  if (b.settings) setPrefs(migratePrefs(b.settings))
}

export function downloadJSON(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
