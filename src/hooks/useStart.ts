import { useNavigate } from 'react-router-dom'
import { db, startSession } from '../lib/db'
import { attempt, toast } from '../components/ui'
import type { Workout } from '../types'

/** Start a workout, or take the user back to the one already running. */
export function useStart() {
  const nav = useNavigate()
  return async (w: Workout) => {
    const current = await db.active.get('current')
    if (current) {
      if (current.workout.id !== w.id) toast(`Finish or end ${current.workout.name} before starting another.`)
      return nav('/session')
    }
    if (await attempt(() => startSession(w).then(() => true))) nav('/session')
  }
}
