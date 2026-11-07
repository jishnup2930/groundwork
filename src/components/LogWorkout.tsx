import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Check, CircleHelp } from 'lucide-react'
import { ExerciseDemo } from './ExerciseDemo'
import { findWorkoutLog, setWorkoutMinutes, ticksFor, toggleExercise } from '../lib/db'
import { Dialog, attempt, radioKeys, rovingTab } from './ui'
import { useLogWithCelebration } from '../hooks/useLogging'
import type { Exercise, ISODate, Workout } from '../types'

export const short = (e: Exercise) => `${e.sets} × ${e.duration ? `${e.duration} sec` : e.reps}`
const TIMES = [10, 15, 20, 30, 45]

/** Tick what you did. Every tap saves; there's nothing to submit. */
export function LogWorkout({ workout, date }: { workout: Workout; date: ISODate }) {
  const [showing, setShowing] = useState<Exercise | null>(null)
  const saved = useLiveQuery(() => findWorkoutLog(date, workout.id).then((s) => s ?? null), [date, workout.id])
  const log = useLogWithCelebration()
  if (saved === undefined) return null

  const done = ticksFor(workout, saved)
  const minutes = saved ? Math.round(saved.duration / 60) : workout.estimatedDuration
  const count = done.filter(Boolean).length
  const all = count === done.length
  // Each tap sends an intent (toggle this one), not a whole list, so quick taps can't undo each other.
  const run = (change: () => Promise<unknown>) => attempt(() => log(change))
  const times = [...new Set([...TIMES, workout.estimatedDuration])].sort((a, b) => a - b)

  return (
    <div>
      <ul className="divide-y divide-rule" aria-label={`${workout.name} exercises`}>
        {workout.exercises.map((e, i) => (
          <li key={e.id + i} className="flex items-center gap-1">
            <button aria-pressed={done[i]} onClick={() => run(() => toggleExercise(workout, date, i))}
              className="flex min-h-14 flex-1 items-center gap-3 py-2 text-left">
              <motion.span animate={{ scale: done[i] ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}
                className={`grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors ${done[i] ? 'border-forest bg-forest text-on-forest' : 'border-rule'}`}>
                {done[i] && <Check size={16} strokeWidth={3} aria-hidden />}
              </motion.span>
              <span className={`flex-1 font-semibold ${done[i] ? 'text-ink-soft' : ''}`}>{e.name}</span>
              <span className="num shrink-0 text-sm font-semibold text-ink-soft">{short(e)}</span>
            </button>
            <button onClick={() => setShowing(e)} aria-label={`How to do ${e.name}`} title="Show me how"
              className="grid size-10 shrink-0 place-items-center rounded-full text-forest hover:bg-mint">
              <CircleHelp size={20} aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => run(() => toggleExercise(workout, date, 'all'))}
          className={`btn px-6 ${all ? 'border border-rule text-ink-soft' : 'bg-night text-on-forest hover:bg-ink'}`}>
          {all ? 'Untick all' : count ? 'Tick the rest' : 'All done'}
        </motion.button>
        <span className="num text-sm text-ink-soft">{count} of {done.length} done</span>
      </div>

      <Dialog open={!!showing} onClose={() => setShowing(null)} title={showing?.name ?? ''} wide>
        {showing && <ExerciseDemo exercise={showing} />}
      </Dialog>

      {count > 0 && (
        <div className="mt-4" role="radiogroup" aria-label="How long did it take?" onKeyDown={radioKeys}>
          <p className="mb-2 text-sm font-semibold text-ink-soft">How long did it take?</p>
          <div className="flex flex-wrap gap-2">
            {times.map((t, i) => (
              <button key={t} role="radio" aria-checked={minutes === t} tabIndex={rovingTab(minutes === t, i, times.includes(minutes))} onClick={() => run(() => setWorkoutMinutes(workout, date, t))}
                className={`chip min-h-9 px-4 text-sm ${minutes === t ? 'bg-forest text-on-forest' : 'bg-paper text-ink'}`}>{t} min</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
