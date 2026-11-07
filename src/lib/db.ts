import Dexie, { type EntityTable } from 'dexie'
import type {
  ActiveSession, ISODate, ScheduleVersion, UserProfile, WeekPlan, WeightEntry, Workout, WorkoutSession,
} from '../types'
import { BUILT_IN, scaleForLevel } from '../data/workouts'
import { today } from './dates'

export class GroundworkDB extends Dexie {
  profile!: EntityTable<UserProfile, 'id'>
  sessions!: EntityTable<WorkoutSession, 'id'>
  weights!: EntityTable<WeightEntry, 'date'>
  customWorkouts!: EntityTable<Workout, 'id'>
  schedules!: EntityTable<ScheduleVersion, 'effectiveFrom'>
  active!: EntityTable<ActiveSession, 'id'>

  constructor(name = 'groundwork') {
    super(name)
    // Schema history. To migrate: add `this.version(n+1).stores({...}).upgrade(tx => ...)`, never edit old versions.
    this.version(1).stores({
      profile: 'id',
      sessions: 'id, date, workoutId, category',
      weights: 'date',
      customWorkouts: 'id, updatedAt',
      schedules: 'effectiveFrom',
      active: 'id',
    })
  }
}

export const SCHEMA_VERSION = 1
export const db = new GroundworkDB()

export const ALL_TABLES = ['profile', 'sessions', 'weights', 'customWorkouts', 'schedules', 'active'] as const

/** Resolve a workout id to a playable workout, scaled to the user's level. */
export function resolveWorkout(id: string | null, custom: Workout[], level: UserProfile['fitnessLevel']): Workout | undefined {
  if (!id) return undefined
  const w = BUILT_IN.find((b) => b.id === id) ?? custom.find((c) => c.id === id)
  return w && scaleForLevel(w, level)
}

export async function completeOnboarding(p: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt' | 'onboardingCompleted' | 'startDate'>, weightKg: number, week: WeekPlan) {
  const now = Date.now()
  const d = today()
  await db.transaction('rw', [db.profile, db.weights, db.schedules], async () => {
    await db.profile.put({ ...p, id: 'me', onboardingCompleted: true, startDate: d, createdAt: now, updatedAt: now })
    await db.weights.put({ date: d, weightKg, createdAt: now })
    if (!(await db.schedules.count())) await db.schedules.put({ effectiveFrom: d, days: week })
  })
  // Ask the browser not to evict our data under storage pressure. Best effort.
  navigator.storage?.persist?.().catch(() => {})
}

export const updateProfile = (changes: Partial<UserProfile>) =>
  db.profile.update('me', { ...changes, updatedAt: Date.now() })

/** Schedule changes apply from today on; past days keep the plan they had. */
export const setSchedule = (days: WeekPlan) => db.schedules.put({ effectiveFrom: today(), days })

export const putWeight = (date: ISODate, weightKg: number) => db.weights.put({ date, weightKg, createdAt: Date.now() })

export async function saveCustomWorkout(w: Workout) {
  const now = Date.now()
  await db.customWorkouts.put({ ...w, isCustom: true, category: w.category, createdAt: w.createdAt ?? now, updatedAt: now })
}

export async function deleteCustomWorkout(id: string) {
  await db.transaction('rw', [db.customWorkouts, db.schedules], async () => {
    await db.customWorkouts.delete(id)
    const latest = await db.schedules.orderBy('effectiveFrom').last()
    if (latest?.days.includes(id)) await setSchedule(latest.days.map((d) => (d === id ? null : d)))
  })
}

export function activeMs(a: Pick<ActiveSession, 'elapsedMs' | 'resumedAt'>, now = Date.now()) {
  return a.elapsedMs + (a.resumedAt !== null ? now - a.resumedAt : 0)
}

/**
 * Turn the active session into a history record. The record id is fixed at start time,
 * so calling this twice (double tap, two tabs) can only ever write one record.
 * Returns null when nothing was done (nothing worth recording).
 */
export async function finishSession(now = Date.now()): Promise<WorkoutSession | null> {
  return db.transaction('rw', [db.active, db.sessions], async () => {
    const a = await db.active.get('current')
    if (!a) return null
    await db.active.delete('current')
    const done = a.states.filter((s) => s === 'done').length
    if (done === 0) return null
    const session: WorkoutSession = {
      id: a.sessionId,
      workoutId: a.workout.id,
      workoutName: a.workout.name,
      category: a.workout.category,
      date: today(),
      startedAt: a.startedAt,
      completedAt: now,
      duration: Math.round(activeMs(a, now) / 1000),
      exercisesCompleted: done,
      totalExercises: a.workout.exercises.length,
      completionStatus: done === a.workout.exercises.length ? 'completed' : 'partial',
      exercises: a.workout.exercises.map((e, i) => ({ name: e.name, done: a.states[i] === 'done' })),
    }
    if (!(await db.sessions.get(session.id))) await db.sessions.add(session)
    return session
  })
}

export async function startSession(workout: Workout) {
  const now = Date.now()
  const a: ActiveSession = {
    id: 'current',
    sessionId: crypto.randomUUID(),
    workout,
    index: 0,
    setsDone: workout.exercises.map(() => 0),
    states: workout.exercises.map(() => 'pending'),
    startedAt: now,
    elapsedMs: 0,
    resumedAt: now,
    lastSeenAt: now,
    restEndsAt: null,
  }
  await db.active.put(a)
}

export async function resetAll() {
  await db.transaction('rw', ALL_TABLES.map((t) => db.table(t)), async () => {
    await Promise.all(ALL_TABLES.map((t) => db.table(t).clear()))
  })
}
