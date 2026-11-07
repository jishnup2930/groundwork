import type { Category, Exercise, FitnessLevel, WeekPlan, Workout } from '../types'
import { EXERCISES, type ExerciseKey } from './exercises'

const ex = (key: ExerciseKey): Exercise => ({ id: key, ...EXERCISES[key] })

/** Roughly 3 seconds per rep, plus rests between sets and a short changeover. */
export function estimateMinutes(exercises: Exercise[]): number {
  const secs = exercises.reduce((sum, e) => {
    const work = e.sets * (e.duration ?? (e.reps ?? 10) * 3)
    return sum + work + e.sets * e.restDuration + 15
  }, 0)
  return Math.max(5, Math.round(secs / 60))
}

function make(id: string, name: string, category: Category, description: string, keys: ExerciseKey[]): Workout {
  const exercises = keys.map(ex)
  return { id, name, category, description, exercises, difficulty: 'beginner', isCustom: false, estimatedDuration: estimateMinutes(exercises) }
}

export const BUILT_IN: Workout[] = [
  make('full-body', 'Full body', 'full-body', 'Build strength, improve mobility and get your whole body moving.',
    ['squat', 'wallPushUp', 'gluteBridge', 'kneeRaise', 'birdDog']),
  make('lower-body', 'Lower body', 'lower-body', 'Steady work for the legs and hips, the muscles that carry you through every day.',
    ['squat', 'reverseLunge', 'gluteBridge', 'calfRaise', 'sideLegRaise']),
  make('mobility', 'Active recovery', 'mobility', 'Slow, easy movement to loosen up and help your body recover.',
    ['catCow', 'childsPose', 'sideStretch', 'hipCircles', 'shoulderRolls']),
  make('upper-body', 'Upper body', 'upper-body', 'Arms, chest and shoulders, at a pace that suits you.',
    ['armCircles', 'wallPushUp', 'inclinePushUp', 'shoulderTaps', 'birdDog']),
  make('full-body-flow', 'Full body flow', 'full-body', 'A second full-body session to end the training week with something steady.',
    ['march', 'squat', 'inclinePushUp', 'reverseLunge', 'gluteBridge', 'birdDog']),
  make('cardio-core', 'Light cardio and core', 'cardio-core', 'Get a little warm, then build a steady middle.',
    ['march', 'stepJack', 'kneeRaise', 'deadBug', 'modifiedPlank', 'gluteBridge']),
]

/** Monday … Sunday */
export const DEFAULT_WEEK: WeekPlan = ['full-body', 'lower-body', 'mobility', 'upper-body', 'full-body-flow', 'cardio-core', null]

export const CATEGORY_LABEL: Record<Category, string> = {
  'full-body': 'Full body',
  'lower-body': 'Lower body',
  'upper-body': 'Upper body',
  mobility: 'Mobility',
  'cardio-core': 'Cardio and core',
  custom: 'Custom',
}

/** Built-in workouts are written for beginners; step them up for more experienced people. */
export function scaleForLevel(w: Workout, level: FitnessLevel): Workout {
  if (w.isCustom || level === 'beginner') return w
  const f = level === 'intermediate' ? 1.25 : 1.6
  const exercises = w.exercises.map((e) => ({
    ...e,
    sets: e.sets + 1,
    reps: e.reps && Math.round(e.reps * f),
    duration: e.duration && Math.round((e.duration * f) / 5) * 5,
    difficulty: level,
  }))
  return { ...w, exercises, difficulty: level, estimatedDuration: estimateMinutes(exercises) }
}
