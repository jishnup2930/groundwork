import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pause, Play, SkipForward, X, Check, Timer, RotateCcw } from 'lucide-react'
import { Figure } from '../components/Figure'
import { Confirm, attempt } from '../components/ui'
import { useActive } from '../hooks/useData'
import { activeMs, db, finishSession } from '../lib/db'
import { allResolved, completeSet, pause, recover, reopen, resume, skipExercise } from '../lib/session'
import { clock } from '../lib/dates'
import type { ActiveSession } from '../types'

const save = (a: ActiveSession) => attempt(() => db.active.put(a))

function useNow(ms = 250) {
  const [now, set] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => set(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

const buzz = () => navigator.vibrate?.(200)

export function Player() {
  const a = useActive()
  const nav = useNavigate()
  const now = useNow()
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [workTimer, setWorkTimer] = useState<number | null>(null) // end time of a timed set
  const recovered = useRef(false)
  const finishing = useRef(false)

  // On first load after a closed tab, don't count the time away.
  useEffect(() => {
    if (a && !recovered.current) {
      recovered.current = true
      const r = recover(a, Date.now())
      if (r !== a) save(r)
    }
  }, [a])

  // Heartbeat while running.
  useEffect(() => {
    if (!a || a.resumedAt === null) return
    const id = setInterval(() => db.active.update('current', { lastSeenAt: Date.now() }), 5000)
    return () => clearInterval(id)
  }, [a?.resumedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rest timer ran out.
  useEffect(() => {
    if (a?.restEndsAt && now >= a.restEndsAt) {
      buzz()
      save({ ...a, restEndsAt: null })
    }
  }, [a, now])

  // Timed set ran out: count the set as done.
  useEffect(() => {
    if (a && workTimer && now >= workTimer) {
      setWorkTimer(null)
      buzz()
      save(completeSet(a, Date.now()))
    }
  }, [a, now, workTimer])

  // Leaving the page while a timed set runs shouldn't leave it half-counted.
  useEffect(() => setWorkTimer(null), [a?.index])

  useEffect(() => {
    if (a === null && !finishing.current) nav('/', { replace: true })
  }, [a, nav])

  if (!a) return null

  const ex = a.workout.exercises[a.index]
  const paused = a.resumedAt === null
  const resting = !!a.restEndsAt
  const elapsed = activeMs(a, now) / 1000
  const done = a.states.filter((s) => s === 'done').length
  const set = Math.min(a.setsDone[a.index] + 1, ex.sets)
  const state = a.states[a.index]
  const everything = allResolved(a)
  const nextEx = a.workout.exercises.find((_, i) => i !== a.index && a.states[i] === 'pending')

  const act = (fn: (x: ActiveSession) => ActiveSession) => save(fn(a))
  const go = (d: number) => act((x) => ({ ...x, index: (x.index + d + x.states.length) % x.states.length, restEndsAt: null }))

  const finish = async () => {
    finishing.current = true
    const s = await attempt(() => finishSession())
    if (s) nav(`/session/done/${s.id}`, { replace: true })
    else if (s === null) nav('/', { replace: true })
    else finishing.current = false
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-rule px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link to="/" className="-ml-2 rounded-full p-2 text-ink-soft hover:bg-sand" aria-label="Back to home (your workout stays open)">
            <X size={22} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{a.workout.name}</p>
            <p className="num text-sm text-ink-soft" aria-live="off">{clock(elapsed)}{paused ? ' (paused)' : ''}</p>
          </div>
          <button className="btn-ghost min-h-11 px-4" onClick={() => act((x) => (paused ? resume(x, Date.now()) : pause(x, Date.now())))}>
            {paused ? <><Play size={16} fill="currentColor" aria-hidden /> Resume</> : <><Pause size={16} aria-hidden /> Pause</>}
          </button>
          <button className="btn-primary min-h-11 px-4" onClick={() => setConfirmFinish(true)}>Finish</button>
        </div>
        <ol className="mx-auto mt-4 flex max-w-5xl gap-1.5" aria-label="Workout progress">
          {a.states.map((s, i) => (
            <li key={i} className="flex-1">
              <button onClick={() => act((x) => ({ ...x, index: i, restEndsAt: null }))}
                aria-label={`${a.workout.exercises[i].name}: ${s === 'pending' ? 'to do' : s}${i === a.index ? ', current' : ''}`}
                className={`block h-2 w-full rounded-full ${s === 'done' ? 'bg-forest' : s === 'skipped' ? 'bg-rule' : i === a.index ? 'bg-clay' : 'bg-sand'}`} />
            </li>
          ))}
        </ol>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-5 py-8 sm:px-8 md:grid-cols-[1fr_1.1fr] md:items-start md:gap-12 md:py-12">
        <div className="relative overflow-hidden rounded-[2rem] bg-linen md:sticky md:top-8">
          <Figure move={ex.pose} animate={!paused && !resting} title={`Illustration of ${ex.name}`} className="w-full p-4" />
          {(resting || paused) && (
            <div className="absolute inset-0 grid place-items-center bg-forest/95 p-6 text-center text-on-forest">
              {paused ? (
                <div>
                  <p className="display text-4xl">Paused</p>
                  <p className="mt-2 opacity-80">Take the time you need.</p>
                  <button className="btn-light mt-6" onClick={() => act((x) => resume(x, Date.now()))}><Play size={16} fill="currentColor" aria-hidden /> Resume</button>
                </div>
              ) : (
                <div role="timer" aria-live="polite" aria-atomic>
                  <p className="font-semibold opacity-80">Rest</p>
                  <p className="num font-display text-7xl sm:text-8xl">{clock((a.restEndsAt! - now) / 1000)}</p>
                  <p className="mt-2 opacity-80">Up next: {state === 'pending' ? `${ex.name}, set ${set}` : ex.name}</p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button className="btn min-h-11 border border-on-forest/30 px-4" onClick={() => act((x) => ({ ...x, restEndsAt: (x.restEndsAt ?? Date.now()) + 15000 }))}>+15 sec</button>
                    <button className="btn-light min-h-11 px-5" onClick={() => act((x) => ({ ...x, restEndsAt: null }))}>Skip rest</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <section aria-labelledby="ex-name">
          <p className="font-semibold text-ink-soft">Exercise {a.index + 1} of {a.states.length}: {ex.muscleGroup.toLowerCase()}</p>
          <h1 id="ex-name" className="display mt-2 text-4xl sm:text-5xl">{ex.name}</h1>

          <div className="mt-6 flex items-end gap-8 border-y border-rule py-5">
            <div>
              <p className="text-sm text-ink-soft">Set</p>
              <p className="num text-4xl font-bold">{state === 'pending' ? set : ex.sets}<span className="text-xl font-semibold text-ink-soft"> / {ex.sets}</span></p>
            </div>
            <div>
              <p className="text-sm text-ink-soft">{ex.duration ? 'Hold for' : 'Reps'}</p>
              <p className="num text-4xl font-bold">{ex.duration ? `${ex.duration}s` : ex.reps}</p>
            </div>
            <div>
              <p className="text-sm text-ink-soft">Rest</p>
              <p className="num text-4xl font-bold">{ex.restDuration}s</p>
            </div>
          </div>

          <div className="mt-6">
            {state === 'pending' ? (
              <div className="flex flex-wrap gap-3">
                {ex.duration && !workTimer && (
                  <button className="btn-ghost" disabled={paused || resting} onClick={() => setWorkTimer(Date.now() + ex.duration! * 1000)}>
                    <Timer size={18} aria-hidden /> Start {ex.duration}s timer
                  </button>
                )}
                {workTimer && (
                  <p role="timer" className="num btn bg-sand font-display text-2xl">{clock((workTimer - now) / 1000)}</p>
                )}
                <button className="btn-primary flex-1 sm:flex-none" disabled={paused || resting} onClick={() => { setWorkTimer(null); act((x) => completeSet(x, Date.now())) }}>
                  <Check size={18} aria-hidden /> {set === ex.sets ? 'Complete exercise' : `Done with set ${set}`}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold text-moss">{state === 'done' ? 'Completed' : 'Skipped'}</p>
                <button className="btn-ghost min-h-11" onClick={() => act((x) => reopen(x, x.index))}><RotateCcw size={16} aria-hidden /> Do it again</button>
              </div>
            )}
            {everything && (
              <div className="mt-6 rounded-2xl bg-sand/60 p-5">
                <p className="font-semibold">That’s every exercise.</p>
                <button className="btn-clay mt-3" onClick={finish}>Finish workout</button>
              </div>
            )}
          </div>

          <h2 className="mt-8 font-semibold">How to do it</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 marker:text-ink-soft">
            {ex.instructions.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <p className="mt-5 text-ink-soft"><span className="font-semibold text-ink">Make it easier: </span>{ex.modification}</p>

          <nav aria-label="Exercises" className="mt-8 flex flex-wrap gap-3 border-t border-rule pt-6">
            <button className="btn-ghost min-h-11 px-4" onClick={() => go(-1)}><ChevronLeft size={18} aria-hidden /> Previous</button>
            {state === 'pending' && <button className="btn-ghost min-h-11 px-4" onClick={() => act(skipExercise)}><SkipForward size={16} aria-hidden /> Skip</button>}
            <button className="btn-ghost min-h-11 px-4" onClick={() => go(1)}>Next <ChevronRight size={18} aria-hidden /></button>
          </nav>
          {nextEx && <p className="mt-4 text-sm text-ink-soft">Still to do after this: {a.workout.exercises.filter((_, i) => i !== a.index && a.states[i] === 'pending').map((e) => e.name).join(', ')}.</p>}
          <p className="mt-8 text-sm text-ink-soft">Stop if you feel pain, dizziness or unusual shortness of breath. Gentle is good.</p>
        </section>
      </main>

      <Confirm
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        onConfirm={finish}
        title={done ? 'Finish this workout?' : 'End without saving?'}
        body={done
          ? <>You’ve completed {done} of {a.states.length} exercises in {clock(elapsed)}. It’ll be saved to your history{done < a.states.length ? ' as partly done' : ''}.</>
          : <>You haven’t completed any exercises yet, so nothing will be saved. That’s fine. There’s always later.</>}
        action={done ? 'Finish and save' : 'End workout'}
      />
    </div>
  )
}
