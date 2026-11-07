import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Minus } from 'lucide-react'
import { Dialog, Empty, PageHeader, Segmented } from '../components/ui'
import { useHistory } from '../hooks/useData'
import { activeDays, dayStatus } from '../lib/streak'
import { today, daysOfMonth, formatDuration, formatLong, formatMonth, fromISO, monthKey, weekday } from '../lib/dates'
import { CATEGORY_LABEL } from '../data/workouts'
import type { Category, WorkoutSession } from '../types'

const shiftMonth = (key: string, d: number) => {
  const [y, m] = key.split('-').map(Number)
  const date = new Date(y, m - 1 + d, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function SessionDetails({ s }: { s: WorkoutSession }) {
  return (
    <div>
      <p className="text-ink-soft">{formatLong(s.date)}, started {new Date(s.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
      <dl className="num mt-5 grid grid-cols-3 gap-4 border-y border-rule py-4">
        <div><dt className="text-sm text-ink-soft">Time</dt><dd className="font-bold">{formatDuration(s.duration)}</dd></div>
        <div><dt className="text-sm text-ink-soft">Exercises</dt><dd className="font-bold">{s.exercisesCompleted} of {s.totalExercises}</dd></div>
        <div><dt className="text-sm text-ink-soft">Status</dt><dd className="font-bold">{s.completionStatus === 'completed' ? 'Completed' : 'Partly done'}</dd></div>
      </dl>
      <ul className="mt-4 space-y-2">
        {s.exercises.map((e, i) => (
          <li key={i} className="flex items-center gap-3">
            {e.done ? <Check size={18} className="text-moss" aria-label="Done" /> : <Minus size={18} className="text-ink-soft" aria-label="Skipped" />}
            <span className={e.done ? '' : 'text-ink-soft'}>{e.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function History() {
  const h = useHistory()
  const [month, setMonth] = useState(() => monthKey(today()))
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [type, setType] = useState<Category | 'all'>('all')
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [openSession, setOpenSession] = useState<WorkoutSession | null>(null)

  const filtered = useMemo(
    () => (h?.sessions ?? []).filter((s) => monthKey(s.date) === month && (type === 'all' || s.category === type)).sort((a, b) => b.completedAt - a.completedAt),
    [h, month, type],
  )
  if (!h) return null

  const active = activeDays(h.sessions)
  const days = daysOfMonth(month)
  const firstMonth = monthKey(h.sessions.reduce((min, s) => (s.date < min ? s.date : min), h.startDate))
  const daySessions = openDay ? filtered.filter((s) => s.date === openDay) : []

  return (
    <div>
      <PageHeader title="History" intro="Every workout you’ve done, kept on this device." />

      {h.sessions.length === 0 ? (
        <Empty title="Every journey starts somewhere." body="Your first workout is waiting. Once it’s done, it’ll show up here.">
          <Link to="/" className="btn-primary">Go to today’s workout</Link>
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <button className="rounded-full p-3 hover:bg-sand disabled:opacity-30" disabled={month <= firstMonth} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft size={20} /></button>
              <h2 className="display min-w-44 text-center text-2xl" aria-live="polite">{formatMonth(month)}</h2>
              <button className="rounded-full p-3 hover:bg-sand disabled:opacity-30" disabled={month >= monthKey(h.today)} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month"><ChevronRight size={20} /></button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor="type">Workout type</label>
              <select id="type" className="field min-h-11 w-auto" value={type} onChange={(e) => setType(e.target.value as Category | 'all')}>
                <option value="all">All types</option>
                {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Segmented label="View" value={view} onChange={setView} options={[{ value: 'calendar', label: 'Calendar' }, { value: 'list', label: 'List' }]} />
            </div>
          </div>

          {view === 'calendar' ? (
            <div className="mt-8">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-soft sm:text-sm" aria-hidden>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d} className="pb-2">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: weekday(days[0]) }, (_, i) => <span key={`pad${i}`} />)}
                {days.map((d) => {
                  const status = dayStatus(d, h, active)
                  const count = filtered.filter((s) => s.date === d).length
                  const label = `${fromISO(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}: ${count ? `${count} workout${count > 1 ? 's' : ''}` : status === 'rest' ? 'rest day' : status === 'missed' ? 'no workout' : 'nothing logged'}`
                  return (
                    <button key={d} onClick={() => count && setOpenDay(d)} aria-label={label} aria-disabled={!count}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl text-sm transition-colors sm:text-base ${
                        count ? 'bg-forest font-bold text-on-forest hover:bg-forest-deep'
                        : d === h.today ? 'border-2 border-clay'
                        : status === 'missed' ? 'border border-dashed border-rule text-ink-soft'
                        : 'text-ink-soft'} ${count ? '' : 'cursor-default'}`}>
                      <span className="num">{fromISO(d).getDate()}</span>
                      {status === 'rest' && !count && <span className="mt-1 h-0.5 w-3 rounded bg-rule" aria-hidden />}
                      {count > 1 && <span className="num absolute right-1.5 top-1 text-[0.65rem]" aria-hidden>×{count}</span>}
                    </button>
                  )
                })}
              </div>
              <p className="mt-5 text-sm text-ink-soft">Filled days have a workout; tap one to see it. Dashes are rest days and dashed outlines are planned days without a workout.</p>
            </div>
          ) : filtered.length ? (
            <ul className="mt-6 border-t border-rule">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button onClick={() => setOpenSession(s)} className="grid w-full grid-cols-[4rem_1fr] items-center gap-4 border-b border-rule py-4 text-left hover:bg-sand/30 sm:grid-cols-[5rem_1fr_auto]">
                    <span className="text-center">
                      <span className="num block font-display text-3xl leading-none">{fromISO(s.date).getDate()}</span>
                      <span className="text-xs text-ink-soft">{fromISO(s.date).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                    </span>
                    <span>
                      <span className="block font-semibold">{s.workoutName}</span>
                      <span className="num block text-sm text-ink-soft">{CATEGORY_LABEL[s.category]}, {formatDuration(s.duration)}, {s.exercisesCompleted} of {s.totalExercises} exercises</span>
                    </span>
                    <span className={`col-start-2 text-sm font-semibold sm:col-start-auto ${s.completionStatus === 'completed' ? 'text-moss' : 'text-ink-soft'}`}>
                      {s.completionStatus === 'completed' ? 'Completed' : 'Partly done'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 text-ink-soft">No workouts{type !== 'all' ? ` of this type` : ''} in {formatMonth(month)}.</p>
          )}
        </>
      )}

      <Dialog open={!!openDay} onClose={() => setOpenDay(null)} title={daySessions.length === 1 ? daySessions[0].workoutName : `${daySessions.length} workouts`}>
        {daySessions.map((s, i) => (
          <div key={s.id} className={i ? 'mt-8 border-t border-rule pt-6' : ''}>
            {daySessions.length > 1 && <h3 className="mb-2 font-semibold">{s.workoutName}</h3>}
            <SessionDetails s={s} />
          </div>
        ))}
      </Dialog>
      <Dialog open={!!openSession} onClose={() => setOpenSession(null)} title={openSession?.workoutName ?? ''}>
        {openSession && <SessionDetails s={openSession} />}
      </Dialog>
    </div>
  )
}
