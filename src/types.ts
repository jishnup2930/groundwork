export type ISODate = string // 'YYYY-MM-DD' in the user's local time

export type FitnessGoal = 'general' | 'weight-loss' | 'muscle' | 'strength' | 'mobility'
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
export type Category = 'full-body' | 'lower-body' | 'upper-body' | 'mobility' | 'cardio-core' | 'custom' | 'activity'
export type Difficulty = FitnessLevel

export interface UserProfile {
  id: 'me'
  name: string
  age: number
  heightCm: number
  fitnessGoal: FitnessGoal
  fitnessLevel: FitnessLevel
  equipment: 'bodyweight'
  avatar?: string // small data: URL, chosen in Profile
  dailyWalk?: { enabled: boolean; minutes: number } // planned every day; unset = default (on, 20 min)
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
  distanceKm?: number // activities such as a walk
}

export interface WeightEntry {
  date: ISODate // one entry per day
  weightKg: number
  createdAt: number
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark'
  weightUnit: 'kg' | 'lb'
  heightUnit: 'cm' | 'ftin'
  reminder: { enabled: boolean; time: string } // 'HH:MM'
  lastMessage?: number
  lastCelebrated?: ISODate // streak animation plays once per day on open
  celebratedTo?: number // highest streak celebrated on lastCelebrated, so untick/re-tick doesn't replay it
  v?: number // settings format; 2 = light became the default theme
}
