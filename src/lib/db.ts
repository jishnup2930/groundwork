import Dexie, { type EntityTable } from 'dexie'
import type {
  ISODate, ScheduleVersion, UserProfile, WeekPlan, WeightEntry, Workout, WorkoutSession,
} from '../types'
import { BUILT_IN, scaleForLevel } from '../data/workouts'
import { toISO, today } from './dates'

export class GroundworkDB extends Dexie {
  profile!: EntityTable<UserProfile, 'id'>
  sessions!: EntityTable<WorkoutSession, 'id'>
  weights!: EntityTable<WeightEntry, 'date'>
  customWorkouts!: EntityTable<Workout, 'id'>
  schedules!: EntityTable<ScheduleVersion, 'effectiveFrom'>

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
    // v2: logging replaced the live timer, so the in-progress workout table goes. History is untouched;
    // a workout that was part-way through is saved to history first rather than silently dropped.
    this.version(2).stores({ active: null }).upgrade(async (tx) => {
      const a = await tx.table('active').get('current')
      const states: unknown[] = Array.isArray(a?.states) ? a.states : []
      const done = states.filter((x) => x === 'done').length
      if (!a?.workout?.exercises || done === 0) return
      const exercises: { name: string }[] = a.workout.exercises
      const id = typeof a.sessionId === 'string' ? a.sessionId : `${toISO(new Date(a.startedAt ?? Date.now()))}:${a.workout.id}`
      if (await tx.table('sessions').get(id)) return
      const now = Date.now()
      await tx.table('sessions').add({
        id, workoutId: a.workout.id, workoutName: a.workout.name, category: a.workout.category,
        date: toISO(new Date(a.startedAt ?? now)), startedAt: a.startedAt ?? now, completedAt: now,
        duration: Math.round((a.elapsedMs ?? 0) / 1000), exercisesCompleted: done, totalExercises: exercises.length,
        completionStatus: done === exercises.length ? 'completed' : 'partial',
        exercises: exercises.map((e, i) => ({ name: e.name, done: states[i] === 'done' })),
      })
    })
  }
}

export const SCHEMA_VERSION = 2
export const db = new GroundworkDB()

export const ALL_TABLES = ['profile', 'sessions', 'weights', 'customWorkouts', 'schedules'] as const

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

/** Id for a new workout log. Older records (from the timer era or old backups) keep their random ids. */
export const workoutLogId = (date: ISODate, workoutId: string) => `${date}:${workoutId}`

/** The log for a workout on a day, whatever its id. */
export const findWorkoutLog = (date: ISODate, workoutId: string) =>
  db.sessions.where('date').equals(date).filter((s) => s.workoutId === workoutId).first()

/** Ticks follow the exercise name, so editing or reordering a custom workout doesn't shift them. */
export const ticksFor = (w: Workout, log?: WorkoutSession | null) =>
  w.exercises.map((e) => log?.exercises.find((x) => x.name === e.name)?.done ?? false)

/**
 * Change a day's log for a workout in one read-modify-write transaction, so fast taps and two tabs
 * can't overwrite each other, and there's only ever one record per workout per day.
 * Unticking everything removes the record.
 */
export function updateWorkoutLog(w: Workout, date: ISODate, change: (done: boolean[], minutes: number) => { done: boolean[]; minutes: number }) {
  return db.transaction('rw', db.sessions, async () => {
    const existing = await findWorkoutLog(date, w.id)
    const { done, minutes } = change(ticksFor(w, existing), existing ? existing.duration / 60 : w.estimatedDuration)
    const count = done.filter(Boolean).length
    if (count === 0) {
      if (existing) await db.sessions.delete(existing.id)
      return
    }
    const now = Date.now()
    await db.sessions.put({
      id: existing?.id ?? workoutLogId(date, w.id),
      workoutId: w.id,
      workoutName: w.name,
      category: w.category,
      date,
      startedAt: existing?.startedAt ?? now,
      completedAt: now,
      duration: Math.round(minutes * 60),
      exercisesCompleted: count,
      totalExercises: w.exercises.length,
      completionStatus: count === w.exercises.length ? 'completed' : 'partial',
      exercises: w.exercises.map((e, i) => ({ name: e.name, done: done[i] })),
    })
  })
}

/** Tick or untick one exercise, or 'all' (ticks everything unless everything is already ticked). */
export const toggleExercise = (w: Workout, date: ISODate, which: number | 'all') =>
  updateWorkoutLog(w, date, (done, minutes) => {
    if (which === 'all') {
      const all = done.every(Boolean)
      return { done: done.map(() => !all), minutes }
    }
    return { done: done.map((d, i) => (i === which ? !d : d)), minutes }
  })

export const setWorkoutMinutes = (w: Workout, date: ISODate, minutes: number) =>
  updateWorkoutLog(w, date, (done) => ({ done, minutes }))

/** Set exact ticks (used by tests and restores). */
export const logWorkout = (w: Workout, date: ISODate, done: boolean[], minutes: number) =>
  updateWorkoutLog(w, date, () => ({ done, minutes }))

/** Log an activity such as a 10 km walk. Several a day are fine, so each gets its own record. */
export async function logActivity(a: { id: string; label: string }, date: ISODate, minutes: number, distanceKm?: number) {
  const now = Date.now()
  const id = `${date}:activity:${a.id}:${crypto.randomUUID()}`
  await db.sessions.add({
    id, workoutId: `activity:${a.id}`, workoutName: a.label, category: 'activity', date,
    startedAt: now, completedAt: now, duration: Math.round(minutes * 60),
    exercisesCompleted: 1, totalExercises: 1, completionStatus: 'completed', exercises: [],
    ...(distanceKm ? { distanceKm } : {}),
  })
  return id
}

export const deleteSession = (id: string) => db.sessions.delete(id)

/** The planned daily walk: one record per day, so ticking it twice can't duplicate it. */
export const dailyWalkId = (date: ISODate) => `${date}:daily-walk`

/** Tick or untick the day's planned walk. */
export function toggleDailyWalk(date: ISODate, minutes: number) {
  return db.transaction('rw', db.sessions, async () => {
    const id = dailyWalkId(date)
    if (await db.sessions.get(id)) return db.sessions.delete(id)
    const now = Date.now()
    await db.sessions.add({
      id, workoutId: 'activity:walk', workoutName: 'Walk', category: 'activity', date,
      startedAt: now, completedAt: now, duration: minutes * 60,
      exercisesCompleted: 1, totalExercises: 1, completionStatus: 'completed', exercises: [],
    })
  })
}

/** Optionally record how far the planned walk went. Tapping the same distance again clears it. */
export const setDailyWalkDistance = (date: ISODate, km: number) =>
  db.transaction('rw', db.sessions, async () => {
    const s = await db.sessions.get(dailyWalkId(date))
    if (s) await db.sessions.put({ ...s, distanceKm: s.distanceKm === km ? undefined : km })
  })

export async function resetAll() {
  await db.transaction('rw', ALL_TABLES.map((t) => db.table(t)), async () => {
    await Promise.all(ALL_TABLES.map((t) => db.table(t).clear()))
  })
}
