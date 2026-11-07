import { beforeEach, describe, expect, it } from 'vitest'
import { completeOnboarding, db, finishSession, putWeight, saveCustomWorkout, deleteCustomWorkout, setSchedule, startSession } from './db'
import { exportData, importData, parseBackup } from './backup'
import { BUILT_IN, DEFAULT_WEEK } from '../data/workouts'
import { today } from './dates'

const profile = { name: 'Sam Test', age: 30, heightCm: 175, fitnessGoal: 'general', fitnessLevel: 'beginner', equipment: 'bodyweight' } as const

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await completeOnboarding(profile, 70, DEFAULT_WEEK)
})

async function doWorkout(doneCount: number) {
  await startSession(BUILT_IN[0])
  const a = (await db.active.get('current'))!
  await db.active.update('current', { states: a.states.map((_, i) => (i < doneCount ? 'done' : 'skipped')) })
}

describe('persistence', () => {
  it('saves the profile, first weight and schedule', async () => {
    expect((await db.profile.get('me'))?.onboardingCompleted).toBe(true)
    expect((await db.weights.toArray()).map((w) => w.weightKg)).toEqual([70])
    expect((await db.schedules.toArray())[0].days).toEqual(DEFAULT_WEEK)
  })
  it('records a completed workout and clears the active session', async () => {
    await doWorkout(5)
    const s = await finishSession()
    expect(s?.completionStatus).toBe('completed')
    expect(s?.exercisesCompleted).toBe(5)
    expect(s?.date).toBe(today())
    expect(await db.active.count()).toBe(0)
    expect(await db.sessions.count()).toBe(1)
  })
  it('marks partly finished workouts as partial', async () => {
    await doWorkout(2)
    expect((await finishSession())?.completionStatus).toBe('partial')
  })
  it('never writes the same workout twice', async () => {
    await doWorkout(5)
    const [a, b] = await Promise.all([finishSession(), finishSession()])
    expect([a, b].filter(Boolean)).toHaveLength(1)
    expect(await db.sessions.count()).toBe(1)
  })
  it('does not record a workout where nothing was done', async () => {
    await doWorkout(0)
    expect(await finishSession()).toBeNull()
    expect(await db.sessions.count()).toBe(0)
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
    await doWorkout(5)
    await finishSession()
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
