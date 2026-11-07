import { describe, expect, it } from 'vitest'
import { currentStreak, dayStatus, longestStreak, monthStats, weekStats, type History } from './streak'
import type { WeekPlan, WorkoutSession } from '../types'

// 2026-11-02 is a Monday.
const WEEK: WeekPlan = ['a', 'b', null, 'c', 'd', 'e', null] // Wed + Sun rest
const s = (date: string, mins = 20, done = 5): WorkoutSession => ({
  id: date + Math.random(), workoutId: 'a', workoutName: 'A', category: 'full-body', date,
  startedAt: 0, completedAt: 0, duration: mins * 60, exercisesCompleted: done, totalExercises: 5,
  completionStatus: done === 5 ? 'completed' : 'partial', exercises: [],
})
const h = (dates: string[], today: string, extra: Partial<History> = {}): History => ({
  sessions: dates.map((d) => s(d)), schedules: [{ effectiveFrom: '2026-10-01', days: WEEK }],
  startDate: '2026-11-02', today, ...extra,
})

describe('streaks', () => {
  it('counts consecutive scheduled days and skips rest days', () => {
    // Mon, Tue done, Wed rest, Thu done; today Fri not yet done
    expect(currentStreak(h(['2026-11-02', '2026-11-03', '2026-11-05'], '2026-11-06'))).toBe(3)
  })
  it('does not break on a rest day with no workout', () => {
    expect(currentStreak(h(['2026-11-02', '2026-11-03'], '2026-11-04'))).toBe(2)
  })
  it('a missed scheduled day ends the streak', () => {
    expect(currentStreak(h(['2026-11-02', '2026-11-05'], '2026-11-06'))).toBe(1) // Tue missed
  })
  it('several workouts on one day count once', () => {
    expect(currentStreak(h(['2026-11-02', '2026-11-02', '2026-11-02'], '2026-11-02'))).toBe(1)
  })
  it('a workout on a rest day adds to the streak', () => {
    expect(currentStreak(h(['2026-11-02', '2026-11-03', '2026-11-04'], '2026-11-04'))).toBe(3)
  })
  it('sessions with nothing done do not count', () => {
    const hist = h([], '2026-11-03')
    hist.sessions = [s('2026-11-02', 5, 0)]
    expect(currentStreak(hist)).toBe(0)
  })
  it('longest streak survives a break', () => {
    const hist = h(['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-07', '2026-11-09'], '2026-11-09')
    // Mon Tue (Wed rest) Thu — Fri missed — Sat … Mon
    expect(longestStreak(hist)).toBe(3)
    expect(currentStreak(hist)).toBe(2) // Sat, (Sun rest), Mon
  })
  it('uses the schedule that was in force on each past day', () => {
    const hist = h(['2026-11-02'], '2026-11-04', {
      // From Tuesday the user made Tuesday a rest day; Monday's history is unchanged.
      schedules: [
        { effectiveFrom: '2026-10-01', days: WEEK },
        { effectiveFrom: '2026-11-03', days: ['a', null, null, 'c', 'd', 'e', null] },
      ],
    })
    expect(dayStatus('2026-11-03', hist)).toBe('rest')
    expect(currentStreak(hist)).toBe(1)
  })
  it('days before the start date are neither missed nor counted', () => {
    expect(dayStatus('2026-10-20', h([], '2026-11-02'))).toBe('none')
  })
})

describe('weekly and monthly progress', () => {
  it('weekly stats', () => {
    const w = weekStats('2026-11-06', h(['2026-11-02', '2026-11-05', '2026-11-05'], '2026-11-06'))
    expect(w.days.map((d) => d.status)).toEqual(['done', 'missed', 'rest', 'done', 'today', 'upcoming', 'rest'])
    expect(w.workouts).toBe(3)
    expect(w.activeDays).toBe(2)
    expect(w.scheduled).toBe(3) // Mon Tue Thu; Fri is today and pending
    expect(w.scheduledDone).toBe(2)
    expect(w.consistency).toBe(67)
    expect(w.minutes).toBe(60)
  })
  it('monthly stats', () => {
    const m = monthStats('2026-11', h(['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-07'], '2026-11-07'))
    expect(m.workouts).toBe(4)
    expect(m.activeDays).toBe(4)
    expect(m.minutes).toBe(80)
    expect(m.scheduled).toBe(5) // Mon Tue Thu Fri Sat
    expect(m.consistency).toBe(80)
    expect(m.longestStreak).toBe(3)
  })
})
