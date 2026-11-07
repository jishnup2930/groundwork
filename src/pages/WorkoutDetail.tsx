import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Play, Trash2 } from 'lucide-react'
import { Figure } from '../components/Figure'
import { Confirm, attempt } from '../components/ui'
import { useCustomWorkouts, useProfile } from '../hooks/useData'
import { useStart } from '../hooks/useStart'
import { deleteCustomWorkout, resolveWorkout } from '../lib/db'
import { CATEGORY_LABEL } from '../data/workouts'
import type { Exercise } from '../types'

export const amount = (e: Exercise) => `${e.sets} ${e.sets === 1 ? 'set' : 'sets'} of ${e.duration ? `${e.duration} sec` : `${e.reps} reps`}`

export function WorkoutDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const profile = useProfile()
  const custom = useCustomWorkouts()
  const start = useStart()
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!profile || !custom) return null
  const w = resolveWorkout(id!, custom, profile.fitnessLevel)
  if (!w) return (
    <div className="py-20 text-center">
      <p className="display text-3xl">This workout isn’t here any more.</p>
      <p className="mt-2 text-ink-soft">It may have been deleted. Plenty of others are ready when you are.</p>
      <Link to="/workouts" className="btn-primary mt-6">See all workouts</Link>
    </div>
  )

  return (
    <div>
      <Link to="/workouts" className="-ml-1 inline-flex min-h-11 items-center gap-1.5 font-semibold text-ink-soft hover:text-ink"><ArrowLeft size={18} aria-hidden /> Workouts</Link>
      <header className="mt-4 grid gap-6 border-b border-rule pb-8 md:grid-cols-[1.5fr_1fr] md:items-end">
        <div>
          <p className="font-semibold text-ink-soft">{CATEGORY_LABEL[w.category]}</p>
          <h1 className="display mt-1 text-5xl sm:text-6xl">{w.name}</h1>
          {w.description && <p className="mt-4 max-w-lg text-lg text-ink-soft">{w.description}</p>}
          <p className="num mt-4 font-semibold">About {w.estimatedDuration} minutes, {w.exercises.length} exercises, {w.difficulty} level, no equipment</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="btn-primary px-7" onClick={() => start(w)}><Play size={18} fill="currentColor" aria-hidden /> Start workout</button>
            {w.isCustom && <>
              <Link to={`/workouts/${w.id}/edit`} className="btn-ghost"><Pencil size={16} aria-hidden /> Edit</Link>
              <button className="btn-ghost" onClick={() => setConfirmDelete(true)}><Trash2 size={16} aria-hidden /> Delete</button>
            </>}
          </div>
        </div>
        <Figure move={w.exercises[0]?.pose} className="hidden w-full rounded-[2rem] bg-linen md:block" />
      </header>

      <ol className="mt-4">
        {w.exercises.map((e, i) => (
          <li key={e.id + i} className="border-b border-rule">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-4 py-4 sm:gap-6">
                <span className="w-16 shrink-0 rounded-xl bg-linen sm:w-20"><Figure move={e.pose} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{e.name}</span>
                  <span className="num block text-sm text-ink-soft">{amount(e)}, {e.restDuration}s rest. {e.muscleGroup}</span>
                </span>
                <span className="text-sm font-semibold text-moss group-open:hidden">Details</span>
                <span className="hidden text-sm font-semibold text-moss group-open:inline">Hide</span>
              </summary>
              <div className="pb-6 sm:pl-26">
                {e.description && <p className="text-ink-soft">{e.description}</p>}
                {e.instructions.length > 0 && <ol className="mt-3 list-decimal space-y-1.5 pl-5">{e.instructions.map((s) => <li key={s}>{s}</li>)}</ol>}
                {e.modification && <p className="mt-3 text-ink-soft"><span className="font-semibold text-ink">Make it easier: </span>{e.modification}</p>}
              </div>
            </details>
          </li>
        ))}
      </ol>
      <p className="mt-8 max-w-xl text-sm text-ink-soft">
        Warm up gently, move within a comfortable range, and stop if you feel pain or dizziness. If you have a health condition or injury, check with a doctor before starting a new routine.
      </p>

      <Confirm open={confirmDelete} onClose={() => setConfirmDelete(false)} danger action="Delete workout" title={`Delete ${w.name}?`}
        body="The workout will be removed and any days it was planned on become rest days from today. Workouts you’ve already done stay in your history."
        onConfirm={async () => { if (await attempt(() => deleteCustomWorkout(w.id).then(() => true), 'Workout deleted')) nav('/workouts') }} />
    </div>
  )
}
