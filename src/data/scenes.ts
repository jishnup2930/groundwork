import type { Category } from '../types'

export type SceneSlot =
  | 'hero' | 'welcome' | 'full-body' | 'lower-body' | 'upper-body'
  | 'mobility' | 'cardio-core' | 'rest' | 'progress' | 'complete'

/** Which illustration each scene shows, and its accent colour. */
export const SCENES: Record<SceneSlot, { move: string; blob: 'sage' | 'mint' | 'sand' | 'apricot'; label: string }> = {
  hero: { move: 'walk', blob: 'sage', label: 'A person walking' },
  welcome: { move: 'sideStretch', blob: 'mint', label: 'A person stretching' },
  'full-body': { move: 'stepJack', blob: 'sage', label: 'A full-body exercise' },
  'lower-body': { move: 'squat', blob: 'sand', label: 'A person doing a squat' },
  'upper-body': { move: 'pushup', blob: 'mint', label: 'A person doing a push-up' },
  mobility: { move: 'yoga', blob: 'sage', label: 'A person in a yoga tree pose' },
  'cardio-core': { move: 'deadBug', blob: 'apricot', label: 'A core exercise' },
  rest: { move: 'meditate', blob: 'mint', label: 'A person meditating' },
  progress: { move: 'walk', blob: 'sand', label: 'A person walking' },
  complete: { move: 'celebrate', blob: 'apricot', label: 'A person celebrating' },
}

export const SCENE_FOR_CATEGORY: Record<Category, SceneSlot> = {
  'full-body': 'full-body',
  'lower-body': 'lower-body',
  'upper-body': 'upper-body',
  mobility: 'mobility',
  'cardio-core': 'cardio-core',
  custom: 'full-body',
  activity: 'progress',
}
