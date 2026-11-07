import type { ActiveSession } from '../types'

type A = ActiveSession

const nextPending = (a: A, from: number) => {
  for (let i = 1; i <= a.states.length; i++) {
    const j = (from + i) % a.states.length
    if (a.states[j] === 'pending') return j
  }
  return -1
}

export const allResolved = (a: A) => a.states.every((s) => s !== 'pending')

/** Finish one set. Starts a rest unless the whole workout is now done. */
export function completeSet(a: A, now: number): A {
  const i = a.index
  const e = a.workout.exercises[i]
  const setsDone = [...a.setsDone]
  setsDone[i] = Math.min(e.sets, setsDone[i] + 1)
  const states = [...a.states]
  let index = i
  if (setsDone[i] >= e.sets) {
    states[i] = 'done'
    const n = nextPending({ ...a, states }, i)
    if (n >= 0) index = n
  }
  const finished = states.every((s) => s !== 'pending')
  return { ...a, setsDone, states, index, restEndsAt: finished ? null : now + e.restDuration * 1000, restLeftMs: null }
}

export function skipExercise(a: A): A {
  const states = [...a.states]
  states[a.index] = 'skipped'
  const n = nextPending({ ...a, states }, a.index)
  return { ...a, states, index: n >= 0 ? n : a.index, restEndsAt: null, restLeftMs: null }
}

/** Mark a skipped or done exercise as to-do again (e.g. skipped by mistake). */
export function reopen(a: A, i: number): A {
  const states = [...a.states]
  const setsDone = [...a.setsDone]
  states[i] = 'pending'
  if (setsDone[i] >= a.workout.exercises[i].sets) setsDone[i] = 0
  return { ...a, states, setsDone, index: i }
}

export function pause(a: A, now: number): A {
  if (a.resumedAt === null) return a
  return { ...a, elapsedMs: a.elapsedMs + (now - a.resumedAt), resumedAt: null, restLeftMs: a.restEndsAt ? Math.max(0, a.restEndsAt - now) : null, restEndsAt: null }
}

export function resume(a: A, now: number): A {
  if (a.resumedAt !== null) return a
  return { ...a, resumedAt: now, restEndsAt: a.restLeftMs ? now + a.restLeftMs : null, restLeftMs: null, lastSeenAt: now }
}

/**
 * Restoring after the tab was closed: time while away shouldn't count as exercise,
 * so bank time up to the last heartbeat and leave the workout paused.
 */
export function recover(a: A, now: number, staleAfterMs = 60_000): A {
  if (a.resumedAt === null || a.lastSeenAt === undefined || now - a.lastSeenAt < staleAfterMs) return a
  return pause(a, a.lastSeenAt)
}
