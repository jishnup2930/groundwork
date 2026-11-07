import { beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { completeOnboarding, dailyWalkId, db, deleteSession, findWorkoutLog, setDailyWalkDistance, toggleDailyWalk, GroundworkDB, logActivity, logWorkout, putWeight, saveCustomWorkout, deleteCustomWorkout, setSchedule, ticksFor, toggleExercise } from './db'
import { getPrefs } from './prefs'
import { currentStreak } from './streak'
import { exportData, importData, parseBackup } from './backup'
import { BUILT_IN, DEFAULT_WEEK } from '../data/workouts'
import { today } from './dates'

const profile = { name: 'Sam Test', age: 30, heightCm: 175, fitnessGoal: 'general', fitnessLevel: 'beginner', equipment: 'bodyweight' } as const

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await completeOnboarding(profile, 70, DEFAULT_WEEK)
})

const W = BUILT_IN[0] // 5 exercises
const ticks = (n: number) => W.exercises.map((_, i) => i < n)

describe('persistence', () => {
  it('saves the profile, first weight and schedule', async () => {
    expect((await db.profile.get('me'))?.onboardingCompleted).toBe(true)
    expect((await db.weights.toArray()).map((w) => w.weightKg)).toEqual([70])
    expect((await db.schedules.toArray())[0].days).toEqual(DEFAULT_WEEK)
  })
  it('logs a workout from ticks and marks it complete', async () => {
    await logWorkout(W, today(), ticks(5), 13)
    const [s] = await db.sessions.toArray()
    expect(s).toMatchObject({ completionStatus: 'completed', exercisesCompleted: 5, duration: 780, date: today() })
  })
  it('marks a partly ticked workout as partial', async () => {
    await logWorkout(W, today(), ticks(2), 13)
    expect((await db.sessions.toArray())[0].completionStatus).toBe('partial')
  })
  it('ticking again updates the same record instead of adding a duplicate', async () => {
    await logWorkout(W, today(), ticks(1), 13)
    await logWorkout(W, today(), ticks(3), 20)
    await Promise.all([logWorkout(W, today(), ticks(4), 20), logWorkout(W, today(), ticks(4), 20)])
    expect(await db.sessions.count()).toBe(1)
    expect((await db.sessions.toArray())[0].exercisesCompleted).toBe(4)
  })
  it('unticking everything removes the record', async () => {
    await logWorkout(W, today(), ticks(2), 13)
    await logWorkout(W, today(), ticks(0), 13)
    expect(await db.sessions.count()).toBe(0)
  })
  it('logs activities, several per day, and they count towards the streak', async () => {
    await logActivity({ id: 'walk', label: 'Walk' }, today(), 120, 10)
    const id = await logActivity({ id: 'walk', label: 'Walk' }, today(), 30, 2)
    const all = await db.sessions.toArray()
    expect(all).toHaveLength(2)
    expect(all.find((s) => s.distanceKm === 10)).toMatchObject({ category: 'activity', workoutName: 'Walk', duration: 7200 })
    const p = (await db.profile.get('me'))!
    expect(currentStreak({ sessions: all, schedules: await db.schedules.toArray(), startDate: p.startDate, today: today() })).toBe(1)
    await deleteSession(id)
    expect(await db.sessions.count()).toBe(1)
  })
  it('keeps one weight entry per day and tracks history', async () => {
    await putWeight('2026-01-01', 72)
    await putWeight('2026-01-01', 71.5)
    const all = await db.weights.orderBy('date').toArray()
    expect(all.map((w) => w.weightKg)).toEqual([71.5, 70])
  })
  it('removes a deleted custom workout from the current schedule only', async () => {
    await saveCustomWorkout({ ...BUILT_IN[0], id: 'custom-1', isCustom: true, category: 'custom' })
    await setSchedule(['custom-1', ...DEFAULT_WEEK.slice(1)])
    await deleteCustomWorkout('custom-1')
    expect(await db.customWorkouts.count()).toBe(0)
    expect((await db.schedules.get(today()))?.days[0]).toBeNull()
  })
})

describe('export and import', () => {
  it('round-trips all data', async () => {
    await logWorkout(W, today(), ticks(5), 13)
    await putWeight('2026-01-01', 72)
    const json = JSON.stringify(await exportData())
    await Promise.all(db.tables.map((t) => t.clear()))
    await importData(parseBackup(json))
    expect(await db.sessions.count()).toBe(1)
    expect(await db.weights.count()).toBe(2)
    expect((await db.profile.get('me'))?.name).toBe('Sam Test')
  })
  it('rejects files that are not Groundwork backups', () => {
    expect(() => parseBackup('nope')).toThrow(/valid JSON/)
    expect(() => parseBackup('{"app":"other"}')).toThrow(/exported from Groundwork/)
    expect(() => parseBackup(JSON.stringify({ app: 'groundwork', version: 1, profile: null, sessions: [{ id: 1 }], weights: [], customWorkouts: [], schedules: [] }))).toThrow(/damaged/)
    expect(() => parseBackup(JSON.stringify({ app: 'groundwork', version: 99 }))).toThrow(/newer version/)
  })
})

describe('review fixes', () => {
  it('fast taps on different exercises never undo each other', async () => {
    await Promise.all([0, 1, 2].map((i) => toggleExercise(W, today(), i)))
    const s = (await db.sessions.toArray())
    expect(s).toHaveLength(1)
    expect(s[0].exercises.map((e) => e.done)).toEqual([true, true, true, false, false])
  })
  it('reuses an older record for the same workout and day instead of adding a duplicate', async () => {
    await db.sessions.add({
      id: 'old-timer-uuid', workoutId: W.id, workoutName: W.name, category: W.category, date: today(), startedAt: 1, completedAt: 2,
      duration: 600, exercisesCompleted: 5, totalExercises: 5, completionStatus: 'completed', exercises: W.exercises.map((e) => ({ name: e.name, done: true })),
    })
    await toggleExercise(W, today(), 0)
    const all = await db.sessions.toArray()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ id: 'old-timer-uuid', exercisesCompleted: 4, duration: 600 })
  })
  it('ticks follow exercise names when a custom workout is reordered', async () => {
    const custom = { ...W, id: 'custom-x', isCustom: true }
    await logWorkout(custom, today(), [true, false, false, false, false], 10)
    const reordered = { ...custom, exercises: [custom.exercises[1], custom.exercises[0], ...custom.exercises.slice(2)] }
    expect(ticksFor(reordered, await findWorkoutLog(today(), 'custom-x'))).toEqual([false, true, false, false, false])
  })
  it('"all" ticks everything, and again unticks everything', async () => {
    await toggleExercise(W, today(), 'all')
    expect((await db.sessions.toArray())[0].completionStatus).toBe('completed')
    await toggleExercise(W, today(), 'all')
    expect(await db.sessions.count()).toBe(0)
  })
  it('upgrades a version 1 database without losing history', async () => {
    const old = new Dexie('gw-upgrade-test')
    old.version(1).stores({ profile: 'id', sessions: 'id, date, workoutId, category', weights: 'date', customWorkouts: 'id, updatedAt', schedules: 'effectiveFrom', active: 'id' })
    await old.table('sessions').add({ id: 'kept', date: '2026-01-01', workoutId: 'full-body', category: 'full-body', exercisesCompleted: 3 })
    await old.table('active').add({
      id: 'current', sessionId: 'mid-workout', workout: { id: 'full-body', name: 'Full body', category: 'full-body', exercises: [{ name: 'Squat' }, { name: 'Bridge' }] },
      states: ['done', 'pending'], startedAt: new Date(2026, 0, 2, 9).getTime(), elapsedMs: 300_000, resumedAt: null,
    })
    old.close()
    const upgraded = new GroundworkDB('gw-upgrade-test')
    await upgraded.open()
    expect(upgraded.verno).toBe(2)
    expect(upgraded.tables.map((t) => t.name)).not.toContain('active')
    expect(await upgraded.sessions.get('kept')).toBeTruthy()
    // the half-finished timer workout was kept as a partial log, not dropped
    expect(await upgraded.sessions.get('mid-workout')).toMatchObject({
      date: '2026-01-02', completionStatus: 'partial', exercisesCompleted: 1, duration: 300,
      exercises: [{ name: 'Squat', done: true }, { name: 'Bridge', done: false }],
    })
    upgraded.close()
  })
  it('imports a version 1 backup: old theme default becomes light, external avatar links are dropped', async () => {
    const b = await exportData()
    const v1 = { ...b, version: 1, profile: { ...b.profile!, avatar: 'https://example.com/me.png' }, settings: { ...b.settings, theme: 'system', v: undefined } }
    const parsed = parseBackup(JSON.stringify(v1))
    expect(parsed.profile?.avatar).toBeUndefined()
    await importData(parsed)
    expect(getPrefs().theme).toBe('light')
    const ok = parseBackup(JSON.stringify({ ...b, profile: { ...b.profile!, avatar: 'data:image/webp;base64,AAAA' } }))
    expect(ok.profile?.avatar).toBe('data:image/webp;base64,AAAA')
  })
})

describe('daily walk', () => {
  it('ticks on, ticks off, never duplicates, and counts as an active day', async () => {
    await toggleDailyWalk(today(), 20)
    const p = (await db.profile.get('me'))!
    const hist = async () => ({ sessions: await db.sessions.toArray(), schedules: await db.schedules.toArray(), startDate: p.startDate, today: today() })
    expect(await db.sessions.get(dailyWalkId(today()))).toMatchObject({ category: 'activity', duration: 1200, workoutName: 'Walk' })
    expect(currentStreak(await hist())).toBe(1)
    await Promise.all([toggleDailyWalk(today(), 20), toggleDailyWalk(today(), 20)]) // off then on again
    expect(await db.sessions.count()).toBe(1)
    await toggleDailyWalk(today(), 20)
    expect(await db.sessions.count()).toBe(0)
  })
  it('records an optional distance, and tapping it again clears it', async () => {
    await toggleDailyWalk(today(), 30)
    await setDailyWalkDistance(today(), 3)
    expect((await db.sessions.get(dailyWalkId(today())))?.distanceKm).toBe(3)
    await setDailyWalkDistance(today(), 3)
    expect((await db.sessions.get(dailyWalkId(today())))?.distanceKm).toBeUndefined()
  })
})
