import { describe, expect, it } from 'vitest'
import { BUILT_IN, DEFAULT_WEEK, scaleForLevel } from './workouts'
import { pickMessage, fillName, MESSAGES } from './messages'

describe('plan', () => {
  it('every scheduled id exists and Sunday rests', () => {
    for (const id of DEFAULT_WEEK) if (id) expect(BUILT_IN.find((w) => w.id === id)).toBeTruthy()
    expect(DEFAULT_WEEK[6]).toBeNull()
  })
  it('steps up for experienced people', () => {
    const w = scaleForLevel(BUILT_IN[0], 'advanced')
    expect(w.exercises[0].sets).toBeGreaterThan(BUILT_IN[0].exercises[0].sets)
    expect(scaleForLevel(BUILT_IN[0], 'beginner')).toBe(BUILT_IN[0])
  })
  it('never repeats the last message', () => {
    expect(pickMessage(3, () => 3 / MESSAGES.length)).toBe(4)
    expect(fillName('{name}, hi', 'Ada Lovelace')).toBe('Ada, hi')
  })
})
