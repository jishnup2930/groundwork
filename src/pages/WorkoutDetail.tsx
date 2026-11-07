import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Pencil, Trash2 } from 'lucide-react'
import { Figure } from '../components/Figure'
import { Scene } from '../components/Scene'
import { SCENE_FOR_CATEGORY } from '../data/scenes'
import { Confirm, Segmented, attempt } from '../components/ui'
import { useCustomWorkouts, useProfile } from '../hooks/useData'
import { LogWorkout } from '../components/LogWorkout'
import { today, addDays } from '../lib/dates'
import { deleteCustomWorkout, resolveWorkout } from '../lib/db'
import { CATEGORY_LABEL } from '../data/workouts'
import type { Exercise } from '../types'

export const amount = (e: Exercise) => `${e.sets} ${e.sets === 1 ? 'set' : 'sets'} of ${e.duration ? `${e.duration} sec` : `${e.reps} reps`}`

export function WorkoutDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const profile = useProfile()
  const custom = useCustomWorkouts()
  const [when, setWhen] = useState<'today' | 'yesterday'>('today')
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
      <header className="relative isolate flex min-h-[26rem] flex-col overflow-hidden rounded-[2.25rem] p-5 shadow-soft sm:min-h-[30rem] sm:p-7">
        <Scene slot={SCENE_FOR_CATEGORY[w.category]} className="absolute inset-0 -z-10" figureClass="left-1/2 -translate-x-1/2 w-auto top-[6%] h-[38%] md:left-auto md:right-[4%] md:translate-x-0 md:top-[12%] md:h-[72%]" />
        <span className="absolute inset-x-0 bottom-0 -z-10 h-3/5 bg-gradient-to-t from-linen via-linen/85 to-transparent md:h-full md:w-3/5 md:bg-gradient-to-r" aria-hidden />
        <Link to="/workouts" className="icon-btn" aria-label="Back to workouts"><ArrowLeft size={20} /></Link>
        <div className="mt-auto max-w-xl">
          <span className="chip bg-mint text-forest">{CATEGORY_LABEL[w.category]}</span>
          <h1 className="display mt-3 text-5xl sm:text-6xl">{w.name}</h1>
          {w.description && <p className="mt-3 max-w-lg text-lg text-ink-soft">{w.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {[`${w.estimatedDuration} min`, `${w.exercises.length} exercises`, w.difficulty[0].toUpperCase() + w.difficulty.slice(1), 'No equipment'].map((t) => <span key={t} className="chip bg-linen text-ink shadow-soft">{t}</span>)}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#log" className="btn bg-night px-7 text-on-forest hover:bg-ink"><Check size={18} aria-hidden /> Log this workout</a>
            {w.isCustom && <>
              <Link to={`/workouts/${w.id}/edit`} className="btn-ghost"><Pencil size={16} aria-hidden /> Edit</Link>
              <button className="btn-ghost" onClick={() => setConfirmDelete(true)}><Trash2 size={16} aria-hidden /> Delete</button>
            </>}
          </div>
        </div>
      </header>

      <section id="log" aria-labelledby="log-title" className="card mt-5 scroll-mt-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="log-title" className="text-xl font-semibold">Did it? Tick it off</h2>
            <p className="text-sm text-ink-soft">Do the workout at home, then tick what you finished. Each tap saves.</p>
          </div>
          <Segmented label="Which day" value={when} onChange={setWhen} options={[{ value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' }]} />
        </div>
        <div className="mt-4"><LogWorkout workout={w} date={when === 'today' ? today() : addDays(today(), -1)} /></div>
      </section>

      <h2 className="mt-8 px-1 text-xl font-semibold">How to do each exercise</h2>

      <ol className="card mt-5 divide-y divide-rule px-5">
        {w.exercises.map((e, i) => (
          <li key={e.id + i}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-4 py-4 sm:gap-6">
                <span className="w-16 shrink-0 rounded-2xl bg-gradient-to-br from-mint to-sand sm:w-20"><Figure move={e.pose} /></span>
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
