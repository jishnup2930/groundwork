/** Everyday activities people can log alongside the home plan. */
export interface ActivityType {
  id: string
  label: string
  /** distance activities can be logged in km; the rest in minutes */
  byDistance: boolean
  /** typical pace, used to estimate time from distance */
  minPerKm?: number
}

export const ACTIVITIES: ActivityType[] = [
  { id: 'walk', label: 'Walk', byDistance: true, minPerKm: 12 },
  { id: 'run', label: 'Run', byDistance: true, minPerKm: 6 },
  { id: 'cycle', label: 'Cycle', byDistance: true, minPerKm: 3 },
  { id: 'yoga', label: 'Yoga', byDistance: false },
  { id: 'skipping', label: 'Skipping', byDistance: false },
  { id: 'dance', label: 'Dance', byDistance: false },
]

export const KM_CHOICES = [1, 2, 3, 5, 10]
export const MINUTE_CHOICES = [10, 15, 20, 30, 45, 60]

/** The walk planned every day. Gentle default for beginners; changeable in the weekly plan. */
export const DEFAULT_DAILY_WALK = { enabled: true, minutes: 20 }
export const dailyWalkPlan = (p: { dailyWalk?: { enabled: boolean; minutes: number } }) => p.dailyWalk ?? DEFAULT_DAILY_WALK
export const WALK_TARGETS = [15, 20, 30, 45, 60]
