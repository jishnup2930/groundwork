import { db } from '../lib/db'
import { currentStreak } from '../lib/streak'
import { celebrate } from '../components/StreakCelebration'
import { useHistory } from './useData'

/** Run a save, then celebrate if it made the streak grow. */
export function useLogWithCelebration() {
  const h = useHistory()
  return async (save: () => Promise<unknown>) => {
    const before = h ? currentStreak(h) : 0
    await save()
    if (!h) return
    const [sessions, schedules] = await Promise.all([db.sessions.toArray(), db.schedules.toArray()])
    const after = currentStreak({ ...h, sessions, schedules })
    if (after > before) celebrate(before, after)
  }
}
