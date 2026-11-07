import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, PenLine, Play, Sprout, Dumbbell } from 'lucide-react'
import { Figure } from '../components/Figure'
import { Rings } from '../components/Rings'
import { WeekStrip } from '../components/WeekStrip'
import { useActive, useHistory, usePlanned, useProfile, useToday } from '../hooks/useData'
import { useStart } from '../hooks/useStart'
import { formatDuration, formatLong } from '../lib/dates'
import { currentStreak, longestStreak, weekStats } from '../lib/streak'
import { CATEGORY_LABEL, BUILT_IN, scaleForLevel } from '../data/workouts'
import { MESSAGES, MILESTONES, fillName, pickMessage } from '../data/messages'
import { getPrefs, setPrefs, usePrefs } from '../lib/prefs'
import type { Workout } from '../types'

// Picked once per app load, so it changes between visits but not while moving between pages.
let messageIndex: number | undefined
function useMessage(name: string) {
  if (messageIndex === undefined) {
    messageIndex = pickMessage(getPrefs().lastMessage)
    setPrefs({ lastMessage: messageIndex })
  }
  return fillName(MESSAGES[messageIndex], name)
}

function greeting(h = new Date().getHours()) {
  if (h < 5) return 'Hello'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function Facts({ w }: { w: Workout }) {
  return (
    <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-3">
      {[
        ['Time', `${w.estimatedDuration} min`],
        ['Exercises', String(w.exercises.length)],
        ['Level', w.difficulty[0].toUpperCase() + w.difficulty.slice(1)],
        ['Equipment', 'None'],
      ].map(([k, v]) => (
        <div key={k}>
          <dt className="text-sm opacity-70">{k}</dt>
          <dd className="num text-xl font-bold">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Dashboard() {
  const profile = useProfile()
  const today = useToday()
  const history = useHistory()
  const planned = usePlanned(today)
  const active = useActive()
  const prefs = usePrefs()
  const start = useStart()
  const first = profile?.name.split(' ')[0] ?? ''
  const message = useMessage(profile?.name ?? '')

  const stats = useMemo(() => history && {
    week: weekStats(today, history),
    streak: currentStreak(history),
    longest: longestStreak(history),
  }, [history, today])

  if (!profile || !history || !planned || !stats || active === undefined) return null

  const todays = history.sessions.filter((s) => s.date === today)
  const doneToday = todays.filter((s) => s.exercisesCompleted > 0)
  const w = planned.workout
  const milestone = Object.keys(MILESTONES).map(Number).filter((m) => m <= stats.streak).pop()
  const [rh, rm] = prefs.reminder.time.split(':').map(Number)
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  const nudge = prefs.reminder.enabled && w && !doneToday.length && !active && nowMins >= rh * 60 + rm

  // Today's progress: the running session if there is one, otherwise what's been saved today.
  const progress = active
    ? { done: active.states.filter((s) => s === 'done').length, total: active.workout.exercises.length, secs: 0 }
    : { done: doneToday.reduce((t, s) => t + s.exercisesCompleted, 0), total: doneToday.reduce((t, s) => t + s.totalExercises, 0) || (w?.exercises.length ?? 0), secs: doneToday.reduce((t, s) => t + s.duration, 0) }
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div>
      <header className="rise">
        <p className="font-semibold text-ink-soft">{formatLong(today)}</p>
        <h1 className="display mt-2 text-5xl sm:text-6xl lg:text-7xl">{greeting()}, {first}.</h1>
        <p className="mt-4 max-w-xl font-display text-xl text-ink-soft sm:text-2xl">{message}</p>
      </header>

      <section aria-labelledby="today-title" className="rise mt-10 overflow-hidden rounded-[2rem] bg-forest text-on-forest" style={{ animationDelay: '120ms' }}>
        <div className="grid items-center gap-2 p-7 sm:p-10 md:grid-cols-[1.4fr_1fr]">
          {doneToday.length > 0 && !active ? (
            <div>
              <p className="font-semibold opacity-75">Today</p>
              <h2 id="today-title" className="display mt-2 text-4xl sm:text-5xl">You showed up today, {first}. That’s what matters.</h2>
              <p className="mt-4 max-w-md opacity-80">
                {doneToday.map((s) => s.workoutName).join(' and ')} done. Rest well, drink some water, and enjoy the rest of your day.
              </p>
              <Link to="/workouts" className="btn-light mt-8">Do another workout</Link>
            </div>
          ) : w ? (
            <div>
              <p className="font-semibold opacity-75">Today’s focus: {CATEGORY_LABEL[w.category]}</p>
              <h2 id="today-title" className="display mt-2 text-4xl sm:text-5xl">{w.name}</h2>
              <p className="mt-3 max-w-md opacity-80">{w.description}</p>
              <Facts w={w} />
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button className="btn-light px-7" onClick={() => start(active ? active.workout : w)}>
                  <Play size={18} fill="currentColor" aria-hidden /> {active ? 'Resume workout' : 'Start workout'}
                </button>
                <Link to={`/workouts/${w.id}`} className="font-semibold underline decoration-2 underline-offset-4 opacity-80 hover:opacity-100">See the exercises</Link>
              </div>
            </div>
          ) : (
            <div>
              <p className="font-semibold opacity-75">Today</p>
              <h2 id="today-title" className="display mt-2 text-4xl sm:text-5xl">Rest day</h2>
              <p className="mt-3 max-w-md opacity-80">Recovery is part of the work. Your muscles get stronger while you rest.</p>
              <button className="btn-light mt-8" onClick={() => start(scaleForLevel(BUILT_IN.find((b) => b.id === 'mobility')!, profile.fitnessLevel))}>
                Fancy moving? Try gentle mobility
              </button>
            </div>
          )}
          <Figure move={doneToday.length && !active ? 'childsPose' : w?.exercises[0]?.pose ?? 'childsPose'} tone="paper" className="order-first -mb-2 w-44 justify-self-start opacity-95 md:order-none md:w-full md:max-w-xs md:justify-self-end" />
        </div>
        {(w || doneToday.length > 0) && (
          <div className="border-t border-on-forest/15 px-7 py-5 sm:px-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold">{active ? 'In progress' : doneToday.length ? 'Completed' : 'Not started yet'}</span>
              <span className="num opacity-80">
                {progress.done} of {progress.total} exercises{progress.secs ? `, ${formatDuration(progress.secs)}` : ''}, {pct}%
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-on-forest/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Today’s progress">
              <div className="h-full rounded-full bg-clay transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </section>

      {nudge && <p className="mt-4 rounded-2xl border border-clay/40 px-5 py-3 text-ink-soft">It’s past {prefs.reminder.time}, your reminder time. There’s still plenty of today left for {w!.name.toLowerCase()}.</p>}

      <div className="mt-14 grid gap-12 md:grid-cols-[1.25fr_1fr] md:gap-16">
        <section aria-labelledby="week-title">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="week-title" className="display text-2xl">This week</h2>
            <span className="num text-sm text-ink-soft">{stats.week.scheduled ? `${stats.week.scheduledDone} of ${stats.week.scheduled} planned days so far` : 'Your first week starts here'}</span>
          </div>
          <div className="mt-6"><WeekStrip days={stats.week.days} today={today} /></div>
          <p className="mt-6 text-sm text-ink-soft">
            Filled circles are workouts done. Dashes are rest days. Missed days don’t erase anything. Just pick up from today.
          </p>
        </section>

        <section aria-labelledby="streak-title" className="flex items-center gap-6">
          <Rings count={stats.streak} size={150} />
          <div>
            <h2 id="streak-title" className="sr-only">Streak</h2>
            <p className="num font-display text-6xl leading-none">{stats.streak}</p>
            <p className="mt-1 font-semibold">{stats.streak === 1 ? 'workout day in a row' : 'workout days in a row'}</p>
            <p className="mt-3 text-sm text-ink-soft">
              {stats.streak === 0 ? 'One workout is all it takes to begin.' : milestone ? MILESTONES[milestone] : 'Each ring is a day you showed up.'}
            </p>
            <dl className="num mt-4 flex gap-4 text-sm sm:gap-6">
              <div><dt className="text-ink-soft">Longest</dt><dd className="text-lg font-bold">{stats.longest}</dd></div>
              <div><dt className="text-ink-soft">Total</dt><dd className="text-lg font-bold">{history.sessions.length}</dd></div>
              <div><dt className="text-ink-soft">This week</dt><dd className="text-lg font-bold">{stats.week.consistency}%</dd></div>
            </dl>
          </div>
        </section>
      </div>

      <nav aria-label="Shortcuts" className="mt-16 grid border-t border-rule sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: w ? 'Start today’s workout' : 'Browse workouts', to: w ? undefined : '/workouts', icon: Dumbbell, onClick: w ? () => start(active?.workout ?? w) : undefined },
          { label: 'Workout history', to: '/history', icon: CalendarDays },
          { label: 'Your progress', to: '/progress', icon: Sprout },
          { label: 'Create a workout', to: '/workouts/new', icon: PenLine },
        ].map(({ label, to, icon: Icon, onClick }) => {
          const cls = 'flex min-h-16 w-full items-center gap-3 border-b border-rule py-4 text-left font-semibold hover:text-clay lg:border-b-0 lg:border-r lg:px-5 lg:first:pl-0 lg:last:border-r-0'
          const body = <><Icon size={20} className="text-moss" aria-hidden />{label}</>
          return to ? <Link key={label} to={to} className={cls}>{body}</Link> : <button key={label} onClick={onClick} className={cls}>{body}</button>
        })}
      </nav>
    </div>
  )
}
