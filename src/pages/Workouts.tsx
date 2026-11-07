import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Scene } from '../components/Scene'
import { SCENE_FOR_CATEGORY } from '../data/scenes'
import { Empty, PageHeader, attempt, radioKeys, rovingTab } from '../components/ui'
import { useCustomWorkouts, useProfile, useSchedules, useToday } from '../hooks/useData'
import { setSchedule, updateProfile } from '../lib/db'
import { dailyWalkPlan, WALK_TARGETS } from '../data/activities'
import { DAY_NAMES, weekday } from '../lib/dates'
import { BUILT_IN, CATEGORY_LABEL, scaleForLevel } from '../data/workouts'
import type { Workout } from '../types'

export function WorkoutRow({ w }: { w: Workout }) {
  return (
    <li>
      <Link to={`/workouts/${w.id}`} className="card group flex h-full flex-col overflow-hidden transition-transform hover:-translate-y-1">
        <Scene slot={SCENE_FOR_CATEGORY[w.category]} className="h-44 rounded-[1.5rem] m-2" />
        <span className="flex flex-1 flex-col px-5 pb-5 pt-2">
          <span className="chip w-fit bg-mint text-forest">{CATEGORY_LABEL[w.category]}</span>
          <span className="mt-2 text-xl font-semibold">{w.name}</span>
          <span className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip bg-paper text-ink">{w.estimatedDuration} min</span>
            <span className="chip bg-paper text-ink">{w.exercises.length} {w.exercises.length === 1 ? 'exercise' : 'exercises'}</span>
            <span className="chip bg-paper capitalize text-ink">{w.difficulty}</span>
          </span>
        </span>
      </Link>
    </li>
  )
}

export function Workouts() {
  const profile = useProfile()
  const schedules = useSchedules()
  const custom = useCustomWorkouts()
  const today = useToday()
  if (!profile || !schedules || !custom) return null

  const week = schedules[schedules.length - 1]?.days ?? Array(7).fill(null)
  const all = [...BUILT_IN, ...custom]
  const walk = dailyWalkPlan(profile)
  const change = (day: number, id: string) => {
    const next = [...week]
    next[day] = id || null
    attempt(() => setSchedule(next), 'Plan updated. Changes apply from today; past days keep their plan.')
  }

  return (
    <div>
      <PageHeader title="Workouts" intro="Your weekly plan, the workout library and anything you’ve made yourself.">
        <Link to="/workouts/new" className="btn-primary"><Plus size={18} aria-hidden /> Create a workout</Link>
      </PageHeader>

      <section aria-labelledby="plan-title" className="card p-5 sm:p-7">
        <h2 id="plan-title" className="text-2xl font-semibold">Your week</h2>
        <p className="mt-2 max-w-xl text-ink-soft">Choose what happens each day. Rest days never break your streak.</p>
        <ul className="mt-5 divide-y divide-rule">
          {DAY_NAMES.map((day, i) => {
            const isToday = weekday(today) === i
            return (
              <li key={day} className={`grid grid-cols-[6.5rem_1fr] items-center gap-3 py-3 sm:grid-cols-[10rem_1fr] ${isToday ? 'text-forest' : ''}`}>
                <label htmlFor={`day-${i}`} className="font-semibold">
                  {day}{isToday && <span className="block text-xs font-semibold sm:inline sm:pl-2">today</span>}
                </label>
                <select id={`day-${i}`} className="field text-ink" value={week[i] ?? ''} onChange={(e) => change(i, e.target.value)}>
                  <option value="">Rest day</option>
                  <optgroup label="Library">
                    {BUILT_IN.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </optgroup>
                  {custom.length > 0 && (
                    <optgroup label="Your workouts">
                      {custom.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </optgroup>
                  )}
                </select>
              </li>
            )
          })}
        </ul>
        <div className="mt-5 rounded-2xl bg-mint p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Daily walk</p>
              <p className="text-sm text-ink-soft">Planned every day, alongside the workout. Ticked off from Home.</p>
            </div>
            <div role="radiogroup" aria-label="Daily walk" onKeyDown={radioKeys} className="flex flex-wrap gap-2">
              {[0, ...WALK_TARGETS].map((m, i) => {
                const on = m === 0 ? !walk.enabled : walk.enabled && walk.minutes === m
                return (
                  <button key={m} role="radio" aria-checked={on} tabIndex={rovingTab(on, i, true)}
                    onClick={() => attempt(() => updateProfile({ dailyWalk: m === 0 ? { ...walk, enabled: false } : { enabled: true, minutes: m } }), m === 0 ? 'Daily walk turned off' : `Daily walk set to ${m} minutes`)}
                    className={`chip min-h-10 px-4 text-sm ${on ? 'bg-forest text-on-forest' : 'bg-linen text-ink'}`}>{m === 0 ? 'Off' : `${m} min`}</button>
                )
              })}
            </div>
          </div>
        </div>
        {week.some((id) => id && !all.find((w) => w.id === id)) && <p className="mt-3 text-sm text-clay">One of these days points to a workout that no longer exists. Pick another for it.</p>}
      </section>

      <section aria-labelledby="mine-title" className="mt-16">
        <h2 id="mine-title" className="text-2xl font-semibold">Your workouts</h2>
        {custom.length ? (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{custom.map((w) => <WorkoutRow key={w.id} w={w} />)}</ul>
        ) : (
          <div className="mt-6">
            <Empty title="Create a workout that feels right for you." body="Pick exercises from the library or add your own, then set the reps and rest that suit you.">
              <Link to="/workouts/new" className="btn-primary">Create a workout</Link>
            </Empty>
          </div>
        )}
      </section>

      <section aria-labelledby="lib-title" className="mt-16">
        <h2 id="lib-title" className="text-2xl font-semibold">Library</h2>
        <p className="mt-2 text-ink-soft">Bodyweight workouts, set for {profile.fitnessLevel} level. You can change your level in your profile.</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{BUILT_IN.map((w) => <WorkoutRow key={w.id} w={scaleForLevel(w, profile.fitnessLevel)} />)}</ul>
      </section>
    </div>
  )
}
