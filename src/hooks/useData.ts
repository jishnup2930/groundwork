import { useLiveQuery } from 'dexie-react-hooks'
import { db, resolveWorkout } from '../lib/db'
import { today } from '../lib/dates'
import { plannedFor, type History } from '../lib/streak'
import { useEffect, useState } from 'react'

export const useProfile = () => useLiveQuery(() => db.profile.get('me').then((p) => p ?? null))
export const useCustomWorkouts = () => useLiveQuery(() => db.customWorkouts.orderBy('updatedAt').reverse().toArray())
export const useActive = () => useLiveQuery(() => db.active.get('current').then((a) => a ?? null))
export const useWeights = () => useLiveQuery(() => db.weights.orderBy('date').toArray())
export const useSessions = () => useLiveQuery(() => db.sessions.orderBy('date').toArray())
export const useSchedules = () => useLiveQuery(() => db.schedules.orderBy('effectiveFrom').toArray())

/** Today's date, refreshed if the app stays open past midnight. */
export function useToday() {
  const [d, set] = useState(today)
  useEffect(() => {
    const id = setInterval(() => set(today()), 60_000)
    return () => clearInterval(id)
  }, [])
  return d
}

/** Everything streak and progress maths needs, or undefined while loading. */
export function useHistory(): History | undefined {
  const t = useToday()
  const profile = useProfile()
  const sessions = useSessions()
  const schedules = useSchedules()
  if (!profile || !sessions || !schedules) return undefined
  return { sessions, schedules, startDate: profile.startDate, today: t }
}

export function usePlanned(date: string) {
  const profile = useProfile()
  const schedules = useSchedules()
  const custom = useCustomWorkouts()
  if (!profile || !schedules || !custom) return undefined
  const id = plannedFor(date, schedules)
  return { id, workout: resolveWorkout(id, custom, profile.fitnessLevel) }
}
