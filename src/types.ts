export type ISODate = string // 'YYYY-MM-DD' in the user's local time

export type FitnessGoal = 'general' | 'weight-loss' | 'muscle' | 'strength' | 'mobility'
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
export type Category = 'full-body' | 'lower-body' | 'upper-body' | 'mobility' | 'cardio-core' | 'custom'
export type Difficulty = FitnessLevel

export interface UserProfile {
  id: 'me'
  name: string
  age: number
  heightCm: number
  fitnessGoal: FitnessGoal
  fitnessLevel: FitnessLevel
  equipment: 'bodyweight'
  onboardingCompleted: boolean
  startDate: ISODate // first day streaks are counted from
  createdAt: number
  updatedAt: number
}

export interface Exercise {
  id: string
  name: string
  description: string
  instructions: string[]
  muscleGroup: string
  sets: number
  reps?: number // either reps …
  duration?: number // … or seconds per set
  restDuration: number // seconds
  difficulty: Difficulty
  modification: string
  pose?: string // key into the illustration library
}

export interface Workout {
  id: string
  name: string
  category: Category
  description: string
  exercises: Exercise[]
  estimatedDuration: number // minutes
  difficulty: Difficulty
  isCustom: boolean
  createdAt?: number
  updatedAt?: number
}

/** day index 0 = Monday … 6 = Sunday; null = rest day */
export type WeekPlan = (string | null)[]

export interface ScheduleVersion {
  effectiveFrom: ISODate
  days: WeekPlan
}

export type CompletionStatus = 'completed' | 'partial'

export interface WorkoutSession {
  id: string
  workoutId: string
  workoutName: string
  category: Category
  date: ISODate
  startedAt: number
  completedAt: number
  duration: number // seconds of active time
  exercisesCompleted: number
  totalExercises: number
  completionStatus: CompletionStatus
  exercises: { name: string; done: boolean }[]
}

export interface WeightEntry {
  date: ISODate // one entry per day
  weightKg: number
  createdAt: number
}

export type ExerciseState = 'pending' | 'done' | 'skipped'

/** The in-progress workout, persisted so a closed tab can resume. */
export interface ActiveSession {
  id: 'current'
  sessionId: string
  workout: Workout
  index: number
  setsDone: number[]
  states: ExerciseState[]
  startedAt: number
  elapsedMs: number // active time banked before resumedAt
  resumedAt: number | null // null while paused
  restEndsAt: number | null
  restLeftMs?: number | null // remaining rest while paused
  lastSeenAt?: number // heartbeat, so time with the tab closed isn't counted
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark'
  weightUnit: 'kg' | 'lb'
  heightUnit: 'cm' | 'ftin'
  reminder: { enabled: boolean; time: string } // 'HH:MM'
  lastMessage?: number
}
