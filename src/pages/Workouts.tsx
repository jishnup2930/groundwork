import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Figure } from '../components/Figure'
import { Empty, PageHeader, attempt } from '../components/ui'
import { useCustomWorkouts, useProfile, useSchedules, useToday } from '../hooks/useData'
import { setSchedule } from '../lib/db'
import { DAY_NAMES, weekday } from '../lib/dates'
import { BUILT_IN, CATEGORY_LABEL, scaleForLevel } from '../data/workouts'
import type { Workout } from '../types'

export function WorkoutRow({ w }: { w: Workout }) {
  return (
    <li>
      <Link to={`/workouts/${w.id}`} className="group flex items-center gap-4 border-b border-rule py-4 sm:gap-6">
        <span className="w-20 shrink-0 rounded-2xl bg-linen sm:w-24"><Figure move={w.exercises[0]?.pose} /></span>
        <span className="min-w-0 flex-1">
          <span className="display block text-xl group-hover:text-clay sm:text-2xl">{w.name}</span>
          <span className="mt-0.5 block text-sm text-ink-soft">
            {CATEGORY_LABEL[w.category]}, {w.estimatedDuration} min, {w.exercises.length} {w.exercises.length === 1 ? 'exercise' : 'exercises'}
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

      <section aria-labelledby="plan-title">
        <h2 id="plan-title" className="display text-3xl">Your week</h2>
        <p className="mt-2 max-w-xl text-ink-soft">Choose what happens each day. Rest days never break your streak.</p>
        <ul className="mt-6 border-t border-rule">
          {DAY_NAMES.map((day, i) => {
            const isToday = weekday(today) === i
            return (
              <li key={day} className={`grid grid-cols-[6.5rem_1fr] items-center gap-3 border-b border-rule py-3 sm:grid-cols-[10rem_1fr] ${isToday ? 'text-clay' : ''}`}>
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
        {week.some((id) => id && !all.find((w) => w.id === id)) && <p className="mt-3 text-sm text-clay">One of these days points to a workout that no longer exists. Pick another for it.</p>}
      </section>

      <section aria-labelledby="mine-title" className="mt-16">
        <h2 id="mine-title" className="display text-3xl">Your workouts</h2>
        {custom.length ? (
          <ul className="mt-4">{custom.map((w) => <WorkoutRow key={w.id} w={w} />)}</ul>
        ) : (
          <div className="mt-6">
            <Empty title="Create a workout that feels right for you." body="Pick exercises from the library or add your own, then set the reps and rest that suit you.">
              <Link to="/workouts/new" className="btn-primary">Create a workout</Link>
            </Empty>
          </div>
        )}
      </section>

      <section aria-labelledby="lib-title" className="mt-16">
        <h2 id="lib-title" className="display text-3xl">Library</h2>
        <p className="mt-2 text-ink-soft">Bodyweight workouts, set for {profile.fitnessLevel} level. You can change your level in your profile.</p>
        <ul className="mt-4">{BUILT_IN.map((w) => <WorkoutRow key={w.id} w={scaleForLevel(w, profile.fitnessLevel)} />)}</ul>
      </section>
    </div>
  )
}
