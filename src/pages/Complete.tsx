import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { useHistory, useProfile } from '../hooks/useData'
import { currentStreak } from '../lib/streak'
import { formatDuration } from '../lib/dates'
import { MILESTONES } from '../data/messages'
import { Rings } from '../components/Rings'
import { Empty } from '../components/ui'

const CLOSERS = [
  'Rest well tonight. You earned it.',
  'Drink some water and notice how you feel.',
  'Same time tomorrow? No pressure.',
  'Every session makes the next one a little easier.',
]

export function Complete() {
  const { id } = useParams()
  const session = useLiveQuery(() => db.sessions.get(id!).then((s) => s ?? null), [id])
  const profile = useProfile()
  const history = useHistory()
  const streak = useMemo(() => (history ? currentStreak(history) : 0), [history])
  const closer = useMemo(() => CLOSERS[Math.floor(Math.random() * CLOSERS.length)], [])

  if (session === undefined || !profile || !history) return null
  if (session === null)
    return (
      <main className="mx-auto grid min-h-dvh max-w-md content-center px-6">
        <Empty title="That workout couldn’t be found." body="It may have been removed with a backup import or reset. Whatever you did today still counts.">
          <Link className="btn-primary" to="/">Go to home</Link>
        </Empty>
      </main>
    )

  const first = profile.name.split(' ')[0]
  const partial = session.completionStatus === 'partial'
  return (
    <main className="mx-auto grid min-h-dvh max-w-2xl content-center px-5 py-12 text-center sm:px-8">
      <div className="rise mx-auto"><Rings count={streak} size={180} /></div>
      <h1 className="display rise mt-8 text-5xl sm:text-7xl" style={{ animationDelay: '100ms' }}>You did it, {first}!</h1>
      <p className="rise mt-4 font-display text-xl text-ink-soft sm:text-2xl" style={{ animationDelay: '180ms' }}>
        {partial ? 'Some is always more than none.' : 'Another promise kept to yourself.'}
      </p>
      {MILESTONES[streak] && <p className="rise mx-auto mt-6 max-w-md rounded-2xl bg-forest px-6 py-4 font-semibold text-on-forest" style={{ animationDelay: '260ms' }}>{MILESTONES[streak]}</p>}

      <dl className="rise num mt-10 grid grid-cols-2 gap-y-6 border-y border-rule py-6 sm:grid-cols-4" style={{ animationDelay: '320ms' }}>
        {[
          ['Workout', session.workoutName],
          ['Time', formatDuration(session.duration)],
          ['Exercises', `${session.exercisesCompleted} of ${session.totalExercises}`],
          ['Streak', `${streak} ${streak === 1 ? 'day' : 'days'}`],
        ].map(([k, v]) => (
          <div key={k}><dt className="text-sm text-ink-soft">{k}</dt><dd className="mt-1 text-lg font-bold">{v}</dd></div>
        ))}
      </dl>

      <p className="mt-8 text-ink-soft">{closer}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">Back to home</Link>
        <Link to="/history" className="btn-ghost">View workout history</Link>
      </div>
    </main>
  )
}
