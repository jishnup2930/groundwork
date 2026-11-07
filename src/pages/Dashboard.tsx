import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, Check, Flame, PenLine, Plus, Sprout, X, Zap } from 'lucide-react'
import { Scene } from '../components/Scene'
import { Avatar } from '../components/Avatar'
import { WeekStrip } from '../components/WeekStrip'
import { useHistory, usePlanned, useProfile, useToday } from '../hooks/useData'
import { LogWorkout } from '../components/LogWorkout'
import { AddActivity } from '../components/AddActivity'
import { Confirm, Dialog, attempt } from '../components/ui'
import type { WorkoutSession } from '../types'
import { dailyWalkId, deleteSession } from '../lib/db'
import { DailyWalk } from '../components/DailyWalk'
import { dailyWalkPlan } from '../data/activities'
import { formatLong } from '../lib/dates'
import { currentStreak, weekStats } from '../lib/streak'
import { CATEGORY_LABEL } from '../data/workouts'
import { MESSAGES, MILESTONES, fillName, pickMessage } from '../data/messages'
import { SCENE_FOR_CATEGORY } from '../data/scenes'
import { getPrefs, setPrefs, usePrefs } from '../lib/prefs'

// Picked once per app load, so it changes between visits; then it gently rotates while Home is open.
let messageIndex: number | undefined
function useRotatingMessage(name: string, everyMs = 12000) {
  if (messageIndex === undefined) {
    messageIndex = pickMessage(getPrefs().lastMessage)
    setPrefs({ lastMessage: messageIndex })
  }
  const [i, setI] = useState(messageIndex)
  useEffect(() => {
    const id = setInterval(() => setI((x) => (messageIndex = (x + 1) % MESSAGES.length)), everyMs)
    return () => clearInterval(id)
  }, [everyMs])
  return { key: i, text: fillName(MESSAGES[i], name) }
}

function greeting(h = new Date().getHours()) {
  if (h < 5) return 'Hello'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.2, 0.7, 0.2, 1] as const },
})

export function Dashboard() {
  const profile = useProfile()
  const today = useToday()
  const history = useHistory()
  const planned = usePlanned(today)
  const prefs = usePrefs()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<WorkoutSession | null>(null)
  const first = profile?.name.split(' ')[0] ?? ''
  const message = useRotatingMessage(profile?.name ?? '')

  const stats = useMemo(() => history && { week: weekStats(today, history), streak: currentStreak(history) }, [history, today])
  if (!profile || !history || !planned || !stats) return null

  const w = planned.workout
  const walkPlan = dailyWalkPlan(profile)
  const todays = history.sessions.filter((s) => s.date === today && s.exercisesCompleted > 0)
  const activities = todays.filter((s) => s.category === 'activity')
  const planDone = w ? todays.find((s) => s.workoutId === w.id)?.completionStatus === 'completed' : false
  const milestone = Object.keys(MILESTONES).map(Number).filter((m) => m <= stats.streak).pop()
  const [rh, rm] = prefs.reminder.time.split(':').map(Number)
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  const nudge = prefs.reminder.enabled && w && !todays.length && nowMins >= rh * 60 + rm

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:gap-6 [&>*]:min-w-0">
      {/* Hero: photo, greeting, streak and this week's numbers */}
      <motion.section {...rise()} aria-labelledby="hello" className="relative isolate flex min-h-[36rem] flex-col overflow-hidden rounded-[2.25rem] shadow-soft lg:sticky lg:top-8 lg:min-h-[46rem]">
        <Scene slot="hero" className="absolute inset-0 -z-10" figureClass="left-1/2 -translate-x-1/2 w-auto top-[38%] h-[34%] lg:top-[34%] lg:h-[42%]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-[38%] bg-gradient-to-b from-paper via-paper/70 to-transparent" aria-hidden />

        <div className="flex items-center gap-3 p-5 sm:p-7">
          <Link to="/profile" aria-label="Your profile"><Avatar name={profile.name} src={profile.avatar} /></Link>
          <span className="chip bg-linen/85 text-ink-soft backdrop-blur">{formatLong(today)}</span>
          <Link to="/workouts" className="icon-btn ml-auto" aria-label="Browse workouts"><Zap size={20} className="text-forest" /></Link>
        </div>

        <div className="px-5 sm:px-7">
          <h1 id="hello" className="display text-[2.75rem] sm:text-6xl">Hey, {first}!</h1>
          <div className="mt-3 flex items-start gap-3">
            <div className="min-h-[3.5rem] flex-1 sm:max-w-sm" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.p key={message.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.45 }}
                  className="text-lg leading-snug text-ink/85 sm:text-xl">
                  {greeting()}. {message.text}
                </motion.p>
              </AnimatePresence>
            </div>
            <motion.div {...rise(0.25)} className="flex shrink-0 items-center gap-2 rounded-3xl bg-linen/90 px-4 py-3 shadow-soft backdrop-blur"
              role="img" aria-label={`${stats.streak} workout day streak`} title={milestone ? MILESTONES[milestone] : 'Your current streak'}>
              <Flame size={22} className="text-apricot" fill="currentColor" aria-hidden />
              <span className="num text-2xl font-semibold">{stats.streak}</span>
            </motion.div>
          </div>
        </div>

        <motion.div {...rise(0.35)} className="mx-4 mb-4 mt-auto rounded-[1.75rem] bg-linen/95 p-5 shadow-float backdrop-blur sm:mx-6 sm:mb-6">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-forest" aria-hidden />
            <h2 className="font-semibold">Active this week</h2>
            <button onClick={() => setAdding(true)} className="ml-auto grid size-9 place-items-center rounded-full border border-rule hover:bg-sand" aria-label="Add an activity"><Plus size={18} /></button>
          </div>
          <dl className="mt-3 grid grid-cols-2 divide-x divide-rule">
            <div className="pr-4">
              <dd className="num text-4xl font-semibold tracking-tight">{stats.week.minutes}<span className="ml-0.5 text-lg font-medium text-ink-soft">min</span></dd>
              <dt className="text-sm text-ink-soft">Time moving</dt>
            </div>
            <div className="pl-5">
              <dd className="num text-4xl font-semibold tracking-tight">{stats.week.workouts}<span className="ml-1 text-lg font-medium text-ink-soft">logged</span></dd>
              <dt className="text-sm text-ink-soft">Done this week</dt>
            </div>
          </dl>
        </motion.div>
      </motion.section>

      <div className="flex flex-col gap-5">
        {/* Today: tick what you did */}
        <motion.section {...rise(0.1)} aria-labelledby="today-title" className="card p-5">
          <div className="flex gap-4">
            <Scene slot={!w ? 'rest' : SCENE_FOR_CATEGORY[w.category]} className="size-20 shrink-0 rounded-2xl sm:size-24" figureClass="left-1/2 -translate-x-1/2 w-auto bottom-[6%] h-[84%]" />
            <div className="min-w-0 flex-1">
              {w ? (
                <>
                  <span className={`chip ${planDone ? 'bg-forest text-on-forest' : 'bg-mint text-forest'}`}>
                    {planDone ? <><Check size={13} strokeWidth={3} aria-hidden /> Done today</> : `Today: ${CATEGORY_LABEL[w.category]}`}
                  </span>
                  <h2 id="today-title" className="mt-2 text-2xl font-semibold leading-tight">{planDone ? `Nicely done, ${first}.` : w.name}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{planDone ? `${w.name} is logged. That’s what matters.` : `Do it at home, then tick each one off. About ${w.estimatedDuration} min.`}</p>
                </>
              ) : (
                <>
                  <span className="chip bg-sand text-ink-soft">Rest day</span>
                  <h2 id="today-title" className="mt-2 text-2xl font-semibold leading-tight">Recovery is part of the work</h2>
                  <p className="mt-1 text-sm text-ink-soft">No workout today. Your daily walk or some gentle stretching still counts.</p>
                </>
              )}
            </div>
          </div>

          {w ? (
            <div className="mt-4">
              <LogWorkout workout={w} date={today} />
              <Link to={`/workouts/${w.id}`} className="mt-4 inline-block text-sm font-semibold text-forest underline decoration-sage decoration-2 underline-offset-4">How to do each exercise</Link>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/workouts/mobility" className="btn-ghost">Gentle mobility</Link>
            </div>
          )}
          {nudge && <p className="mt-4 rounded-2xl bg-apricot/15 px-4 py-3 text-sm text-ink">It’s past {prefs.reminder.time}, your reminder time. There’s still plenty of today left.</p>}
        </motion.section>

        {walkPlan.enabled && <motion.div {...rise(0.12)}><DailyWalk date={today} minutes={walkPlan.minutes} /></motion.div>}

        {/* Anything else */}
        <motion.section {...rise(0.15)} aria-labelledby="extra-title" className="rounded-[1.75rem] bg-mint p-5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h2 id="extra-title" className="text-lg font-semibold">Moved some other way?</h2>
              <p className="text-sm text-ink-soft">Log a walk, run, cycle, yoga or dance in a few taps.</p>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAdding(true)} className="btn shrink-0 bg-night px-5 text-on-forest hover:bg-ink">
              <Plus size={17} aria-hidden /> Add
            </motion.button>
          </div>
          {activities.some((a) => a.id !== dailyWalkId(today)) && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Logged today">
              {activities.filter((a) => a.id !== dailyWalkId(today)).map((a) => (
                <li key={a.id} className="chip min-h-9 bg-linen pr-1.5 text-ink">
                  <Check size={13} strokeWidth={3} className="text-forest" aria-hidden />
                  {a.workoutName} {a.distanceKm ? `${a.distanceKm} km` : `${Math.round(a.duration / 60)} min`}
                  <button className="-my-1 ml-0.5 grid size-9 place-items-center rounded-full hover:bg-sand" aria-label={`Remove ${a.workoutName}`} onClick={() => setRemoving(a)}><X size={13} /></button>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        {/* Week */}
        <motion.section {...rise(0.2)} aria-labelledby="week-title" className="card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="week-title" className="text-xl font-semibold">This week</h2>
            <span className="chip bg-mint text-forest num">
              {stats.week.scheduled ? `${stats.week.scheduledDone} of ${stats.week.scheduled} planned` : 'First week'}
            </span>
          </div>
          <div className="mt-5"><WeekStrip days={stats.week.days} today={today} /></div>
          <p className="mt-4 text-sm text-ink-soft">Rest days never break your streak. Missed a day? Just pick up from today.</p>
        </motion.section>

        {/* Shortcuts */}
        <motion.nav {...rise(0.3)} aria-label="Shortcuts" className="grid grid-cols-2 gap-3">
          {[
            { label: 'Workout history', to: '/history', icon: CalendarDays, tone: 'bg-mint text-forest' },
            { label: 'Your progress', to: '/progress', icon: Sprout, tone: 'bg-sand text-moss' },
            { label: 'Create a workout', to: '/workouts/new', icon: PenLine, tone: 'bg-apricot/20 text-clay' },
            { label: 'Browse workouts', to: '/workouts', icon: Zap, tone: 'bg-sage/40 text-forest-deep' },
          ].map(({ label, to, icon: Icon, tone }) => (
            <Link key={to} to={to} className="flex items-center gap-3 rounded-3xl bg-linen p-4 font-semibold shadow-soft transition-transform hover:-translate-y-0.5">
              <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${tone}`}><Icon size={19} aria-hidden /></span>
              <span className="leading-tight">{label}</span>
            </Link>
          ))}
        </motion.nav>
      </div>

      <Confirm open={!!removing} onClose={() => setRemoving(null)} danger action="Remove" title={`Remove ${removing?.workoutName.toLowerCase() ?? 'activity'}?`}
        body="It will be taken out of today’s log and your streak is recalculated."
        onConfirm={() => removing && attempt(() => deleteSession(removing.id), 'Removed')} />
      <Dialog open={adding} onClose={() => setAdding(false)} title="Add an activity">
        <AddActivity onDone={() => setAdding(false)} />
      </Dialog>
    </div>
  )
}
