import { describe, expect, it } from 'vitest'
import { completeSet, pause, recover, resume, skipExercise, allResolved } from './session'
import { BUILT_IN } from '../data/workouts'
import type { ActiveSession } from '../types'

const w = { ...BUILT_IN[0], exercises: BUILT_IN[0].exercises.slice(0, 2).map((e) => ({ ...e, sets: 2, restDuration: 30 })) }
const fresh = (): ActiveSession => ({
  id: 'current', sessionId: 's', workout: w, index: 0, setsDone: [0, 0], states: ['pending', 'pending'],
  startedAt: 0, elapsedMs: 0, resumedAt: 0, restEndsAt: null,
})

describe('workout session', () => {
  it('rests between sets and moves on after the last set', () => {
    let a = completeSet(fresh(), 1000)
    expect(a.setsDone[0]).toBe(1)
    expect(a.restEndsAt).toBe(31_000)
    a = completeSet(a, 40_000)
    expect(a.states[0]).toBe('done')
    expect(a.index).toBe(1)
  })
  it('skipping marks the exercise and moves on; finishing everything ends rest', () => {
    let a = skipExercise(fresh())
    expect(a.states).toEqual(['skipped', 'pending'])
    a = completeSet(completeSet(a, 0), 0)
    expect(allResolved(a)).toBe(true)
    expect(a.restEndsAt).toBeNull()
  })
  it('pausing stops the clock and holds the rest timer', () => {
    let a = completeSet(fresh(), 10_000) // rest until 40s
    a = pause(a, 20_000)
    expect(a.elapsedMs).toBe(20_000)
    expect(a.restLeftMs).toBe(20_000)
    a = resume(a, 100_000)
    expect(a.restEndsAt).toBe(120_000)
  })
  it('does not count time while the tab was closed', () => {
    const a = recover({ ...fresh(), resumedAt: 0, lastSeenAt: 300_000 }, 3_600_000)
    expect(a.resumedAt).toBeNull()
    expect(a.elapsedMs).toBe(300_000)
  })
})
