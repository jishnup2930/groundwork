import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronLeft, ChevronRight, Clock, Dumbbell, Flame, Pencil, Play, Plus, Scale, Sprout, Trash2, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Confirm, Dialog, Segmented, attempt } from '../components/ui'
import { Avatar } from '../components/Avatar'
import { Scene } from '../components/Scene'
import { Figure } from '../components/Figure'
import { Leaves } from '../components/Leaves'
import { useHistory, usePlanned, useProfile, useWeights } from '../hooks/useData'
import { usePrefs } from '../lib/prefs'
import { db, putWeight } from '../lib/db'
import { bmi, bmiCategory, kgToLb, lbToKg, round1 } from '../lib/health'
import { addDays, formatMonth, formatShort, fromISO, monthKey, startOfWeek } from '../lib/dates'
import { currentStreak, monthStats, weekStats } from '../lib/streak'
import { MILESTONES } from '../data/messages'
import { BUILT_IN, CATEGORY_LABEL, scaleForLevel } from '../data/workouts'
import type { WeightEntry } from '../types'

const ease = [0.2, 0.7, 0.2, 1] as const
const rise = (delay = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, delay, ease } })

function Stepper({ label, onPrev, onNext, nextDisabled }: { label: string; onPrev: () => void; onNext: () => void; nextDisabled: boolean }) {
  return (
    <div className="flex items-center rounded-full bg-paper">
      <button className="rounded-full p-2 hover:bg-sand" onClick={onPrev} aria-label="Previous"><ChevronLeft size={17} /></button>
      <span className="min-w-24 text-center text-sm font-semibold" aria-live="polite">{label}</span>
      <button className="rounded-full p-2 hover:bg-sand disabled:opacity-30" disabled={nextDisabled} onClick={onNext} aria-label="Next"><ChevronRight size={17} /></button>
    </div>
  )
}

function IconTile({ children, tone }: { children: ReactNode; tone: string }) {
  return <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tone}`} aria-hidden>{children}</span>
}

function WeightForm({ initial, onDone }: { initial?: WeightEntry; onDone: () => void }) {
  const { weightUnit: unit } = usePrefs()
  const today = useHistory()?.today ?? ''
  const [date, setDate] = useState(initial?.date ?? today)
  const [value, setValue] = useState(initial ? String(round1(unit === 'kg' ? initial.weightKg : kgToLb(initial.weightKg))) : '')
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = Number(value)
    const kg = unit === 'kg' ? n : lbToKg(n)
    if (!value || !(kg >= 25 && kg <= 350)) return setError(`Enter a weight between ${unit === 'kg' ? '25 and 350 kg' : '55 and 770 lb'}.`)
    if (!date || date > today) return setError('Choose a date that isn’t in the future.')
    const ok = await attempt(async () => {
      await db.transaction('rw', db.weights, async () => {
        if (initial && initial.date !== date) await db.weights.delete(initial.date)
        await putWeight(date, Math.round(kg * 100) / 100)
      })
      return true
    }, initial ? 'Entry updated' : 'Weight saved')
    if (ok) { setValue(''); setError(''); onDone() }
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-3">
      <label className="block"><span className="label">Date</span>
        <input type="date" className="field" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="block w-36"><span className="label">Weight</span>
        <span className="relative block">
          <input inputMode="decimal" className="field num pr-10" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={!!error} />
          <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm text-ink-soft">{unit}</span>
        </span>
      </label>
      <button className="btn-primary">{initial ? 'Save changes' : 'Add entry'}</button>
      {error && <p role="alert" className="w-full text-sm text-clay">{error}</p>}
      {!initial && <p className="w-full text-sm text-ink-soft">Adding a second entry for the same day replaces the first.</p>}
    </form>
  )
}

export function Progress() {
  const profile = useProfile()
  const weights = useWeights()
  const h = useHistory()
  const todayPlan = usePlanned(h?.today ?? '')
  const { weightUnit: unit } = usePrefs()
  const [weekOf, setWeekOf] = useState<string | null>(null)
  const [month, setMonth] = useState<string | null>(null)
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [picked, setPicked] = useState<string | null>(null)
  const [slide, setSlide] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [editing, setEditing] = useState<WeightEntry | null>(null)
  const [deleting, setDeleting] = useState<WeightEntry | null>(null)

  const week = useMemo(() => h && weekStats(weekOf ?? h.today, h), [h, weekOf])
  const mon = useMemo(() => h && monthStats(month ?? monthKey(h.today), h), [h, month])
  const streak = useMemo(() => (h ? currentStreak(h) : 0), [h])
  if (!profile || !weights || !h || !week || !mon || !todayPlan) return null

  const show = (kg: number) => round1(unit === 'kg' ? kg : kgToLb(kg))
  const first = weights[0]
  const latest = weights[weights.length - 1]
  const diff = latest && first ? show(latest.weightKg) - show(first.weightKg) : 0
  const currentBmi = latest ? bmi(latest.weightKg, profile.heightCm) : null
  const category = currentBmi ? bmiCategory(currentBmi, profile.age) : null
  const thisWeek = startOfWeek(h.today)
  const shownWeek = startOfWeek(weekOf ?? h.today)
  const shownMonth = month ?? monthKey(h.today)
  const shiftMonth = (d: number) => {
    const [y, m] = shownMonth.split('-').map(Number)
    const x = new Date(y, m - 1 + d, 1)
    setMonth(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`)
  }

  // Activity chart: pill height follows minutes; every done day stays visible.
  const maxMin = Math.max(20, ...week.days.map((d) => d.minutes))
  const selected = picked && week.days.some((d) => d.date === picked) ? picked : week.days.find((d) => d.date === h.today)?.date ?? week.days[week.days.length - 1].date
  const sel = week.days.find((d) => d.date === selected)!
  const weekSessions = h.sessions.filter((s) => s.date >= week.days[0].date && s.date <= week.days[6].date)
  const weekCats = [...new Set(weekSessions.map((s) => s.category))]

  // Today's goals
  const todaysDone = h.sessions.some((s) => s.date === h.today && s.exercisesCompleted > 0)
  const todayMinutes = Math.round(h.sessions.filter((s) => s.date === h.today).reduce((t, s) => t + s.duration, 0) / 60)
  const goals = [
    { icon: <Dumbbell size={19} />, tone: 'bg-mint text-forest', title: todayPlan.workout ? todayPlan.workout.name : 'Rest day', sub: todayPlan.workout ? 'Today’s planned workout' : 'Nothing planned. Recovery counts', done: todaysDone || !todayPlan.workout },
    { icon: <Clock size={19} />, tone: 'bg-apricot/20 text-clay', title: 'Move for 15 minutes', sub: `${todayMinutes} min so far today`, done: todayMinutes >= 15 },
    { icon: <Scale size={19} />, tone: 'bg-sand text-moss', title: 'Log your weight this week', sub: latest ? `Last entry ${formatShort(latest.date)}` : 'No entries yet', done: !!latest && latest.date >= thisWeek },
  ]

  // Milestones carousel: start at the next one to reach.
  const marks = Object.keys(MILESTONES).map(Number)
  const nextIdx = Math.max(0, marks.findIndex((m) => m > streak))
  const idx = slide ?? (marks.every((m) => m <= streak) ? marks.length - 1 : nextIdx)
  const mark = marks[idx]
  const mobility = scaleForLevel(BUILT_IN.find((b) => b.id === 'mobility')!, profile.fitnessLevel)
  const chart = weights.slice(-12).map((w) => ({ label: fromISO(w.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), weight: show(w.weightKg) }))

  return (
    <div>
      {/* ---- Activity summary ---- */}
      <motion.header {...rise()} className="flex items-center gap-3">
        <Link to="/profile" aria-label="Your profile"><Avatar name={profile.name} src={profile.avatar} /></Link>
        <span className="chip bg-linen text-ink shadow-soft"><Flame size={14} className="text-apricot" fill="currentColor" aria-hidden /> <span className="num">{streak}</span> day streak</span>
        <Link to="/" className="icon-btn ml-auto" aria-label="Log today’s workout"><Check size={18} className="text-forest" strokeWidth={2.5} /></Link>
      </motion.header>
      <motion.h1 {...rise(0.05)} className="display mt-6 text-4xl sm:text-5xl">Activity summary</motion.h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <motion.section {...rise(0.1)} aria-labelledby="days-title" className="card p-5 lg:row-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 id="days-title" className="flex items-center gap-2 text-lg font-semibold"><Sprout size={19} className="text-forest" aria-hidden /> Minutes moving</h2>
            <Stepper label={shownWeek === thisWeek ? 'This week' : formatShort(shownWeek).replace(/ \d{4}$/, '')}
              onPrev={() => { setWeekOf(addDays(shownWeek, -7)); setPicked(null) }} onNext={() => { setWeekOf(addDays(shownWeek, 7)); setPicked(null) }} nextDisabled={shownWeek >= thisWeek} />
          </div>
          <ol className="mt-12 grid h-52 grid-cols-7 items-end gap-2" aria-label="Minutes per day">
            {week.days.map((d, i) => {
              const future = d.status === 'upcoming' || (d.date > h.today)
              const fill = d.minutes ? Math.max(22, (d.minutes / maxMin) * 100) : d.status === 'done' ? 22 : 0
              const isSel = d.date === selected
              const tone = d.date === h.today ? 'bg-apricot' : d.status === 'done' ? 'bg-forest' : 'bg-sage/60'
              return (
                <li key={d.date} className="relative flex h-full flex-col items-center justify-end">
                  {isSel && !future && (
                    <motion.span layoutId="bar-bubble" className="num absolute -top-9 z-10 whitespace-nowrap rounded-full bg-night px-2.5 py-1 text-xs font-semibold text-on-forest" transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
                      {d.minutes} min
                    </motion.span>
                  )}
                  <button onClick={() => setPicked(d.date)} disabled={future}
                    aria-label={`${fromISO(d.date).toLocaleDateString('en-GB', { weekday: 'long' })}: ${d.minutes} minutes${d.status === 'rest' ? ', rest day' : ''}`}
                    className={`relative h-full w-full max-w-12 overflow-hidden rounded-full ${future ? 'bg-track [background-image:repeating-linear-gradient(135deg,transparent_0_6px,rgb(0_0_0/0.04)_6px_8px)]' : 'bg-track'} ${isSel ? 'ring-2 ring-night/80 ring-offset-2 ring-offset-linen' : ''}`}>
                    <motion.span className={`absolute inset-x-0 bottom-0 rounded-full ${tone}`} initial={{ height: 0 }} animate={{ height: `${fill}%` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease }} />
                  </button>
                  <span className={`mt-2 text-xs font-semibold ${d.date === h.today ? 'text-ink' : 'text-ink-soft'}`}>{fromISO(d.date).toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3)}</span>
                </li>
              )
            })}
          </ol>
          <p className="mt-5 text-sm text-ink-soft">
            {fromISO(sel.date).toLocaleDateString('en-GB', { weekday: 'long' })}: {sel.status === 'done' ? `${sel.minutes} minutes moving` : sel.status === 'rest' ? 'a rest day' : sel.status === 'missed' ? 'no workout, and that’s okay' : 'still to come'}.
          </p>
        </motion.section>

        <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
          <motion.section {...rise(0.15)} className="card p-5">
            <div className="flex items-center gap-2"><IconTile tone="bg-mint text-forest"><Dumbbell size={19} /></IconTile><h2 className="font-semibold">Workouts</h2></div>
            <p className="num mt-4 text-4xl font-semibold tracking-tight">{week.workouts}<span className="ml-1 text-base font-medium text-ink-soft">done</span></p>
            <p className="text-sm text-ink-soft">{week.scheduledDone} of {week.scheduled} planned days</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {weekCats.length ? weekCats.map((c) => <span key={c} className="chip bg-mint text-forest">{CATEGORY_LABEL[c]}</span>) : <span className="chip bg-paper text-ink-soft">None yet</span>}
            </div>
          </motion.section>
          <motion.section {...rise(0.2)} className="card p-5">
            <div className="flex items-center gap-2"><IconTile tone="bg-sand text-moss"><Clock size={19} /></IconTile><h2 className="font-semibold">Time</h2></div>
            <p className="num mt-4 text-4xl font-semibold tracking-tight">{week.minutes}<span className="ml-1 text-base font-medium text-ink-soft">min</span></p>
            <p className="text-sm text-ink-soft">{week.consistency}% of planned days</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={week.consistency} aria-valuemin={0} aria-valuemax={100} aria-label="Weekly completion">
              <motion.div className="h-full rounded-full bg-forest" initial={{ width: 0 }} animate={{ width: `${week.consistency}%` }} transition={{ duration: 1, ease }} />
            </div>
          </motion.section>
        </div>

        <motion.section {...rise(0.25)} aria-labelledby="goals-title" className="card p-5">
          <h2 id="goals-title" className="flex items-center gap-2 text-lg font-semibold"><Trophy size={19} className="text-moss" aria-hidden /> Today’s goals</h2>
          <ul className="mt-3 divide-y divide-rule">
            {goals.map((g) => (
              <li key={g.title} className="flex items-center gap-3 py-3">
                <IconTile tone={g.tone}>{g.icon}</IconTile>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{g.title}</p><p className="truncate text-sm text-ink-soft">{g.sub}</p></div>
                <span className={`chip ${g.done ? 'bg-mint text-forest' : 'bg-paper text-ink-soft'}`}>{g.done ? <><Check size={13} strokeWidth={3} aria-hidden /> Complete</> : 'To do'}</span>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>

      {/* ---- Your progress ---- */}
      <div className="mt-14 flex flex-wrap items-end justify-between gap-4">
        <h2 className="display text-4xl">Your progress</h2>
        <Segmented label="Period" value={period} onChange={setPeriod} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="chip bg-mint text-forest">BMI {currentBmi ? round1(currentBmi) : 'not set'}</span>
        <span className="chip bg-sage/30 text-forest-deep">Consistency {period === 'week' ? week.consistency : mon.consistency}%</span>
        <span className="chip bg-apricot/20 text-clay">Longest streak {mon.longestStreak} {mon.longestStreak === 1 ? 'day' : 'days'} this month</span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr] [&>*]:min-w-0">
        {/* Milestones */}
        <section aria-labelledby="ms-title" className="relative isolate min-h-[24rem] overflow-hidden rounded-[2rem] shadow-soft lg:row-span-2">
          <Scene slot="progress" className="absolute inset-0 -z-10" figureClass="left-1/2 -translate-x-1/2 w-auto top-[6%] h-[50%]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-linen via-linen/85 to-transparent" aria-hidden />
          <button className="icon-btn absolute left-4 top-1/2 -translate-y-1/2" onClick={() => setSlide((idx - 1 + marks.length) % marks.length)} aria-label="Previous milestone"><ChevronLeft size={20} /></button>
          <button className="icon-btn absolute right-4 top-1/2 -translate-y-1/2" onClick={() => setSlide((idx + 1) % marks.length)} aria-label="Next milestone"><ChevronRight size={20} /></button>
          <div className="absolute inset-x-0 bottom-0 p-6" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div key={mark} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
                <span className={`chip ${streak >= mark ? 'bg-apricot text-night' : 'bg-sand text-ink'}`}>
                  {streak >= mark ? <><Check size={13} strokeWidth={3} aria-hidden /> Reached</> : `${mark - streak} to go`}
                </span>
                <h3 id="ms-title" className="mt-3 text-3xl font-semibold">{mark} workout days</h3>
                <p className="mt-1 max-w-sm text-ink-soft">{MILESTONES[mark]}</p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 flex gap-1.5" aria-hidden>
              {marks.map((m, i) => <span key={m} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-forest' : 'w-1.5 bg-forest/30'}`} />)}
            </div>
          </div>
        </section>

        {/* Weight */}
        <section aria-labelledby="weight-title" className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="weight-title" className="font-semibold">Weight</h2>
            <button className="grid size-9 place-items-center rounded-full border border-rule hover:bg-sand" onClick={() => setAdding(true)} aria-label="Add a weight entry"><Plus size={18} /></button>
          </div>
          {latest ? (
            <div className="mt-2 grid grid-cols-[auto_1fr] items-end gap-4">
              <div>
                <p className="num text-5xl font-semibold tracking-tight">{show(latest.weightKg)}<span className="ml-1 text-xl font-medium text-ink-soft">{unit}</span></p>
                <p className="text-sm text-ink-soft">{diff === 0 ? 'Same as your first entry' : `${diff > 0 ? '+' : '−'}${round1(Math.abs(diff))} ${unit} since ${formatShort(first.date)}`}</p>
              </div>
              {chart.length > 1 ? (
                <div className="h-20" role="img" aria-label={`Weight trend from ${chart[0].weight} to ${chart[chart.length - 1].weight} ${unit}`}>
                  <ResponsiveContainer>
                    <LineChart data={chart} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                      <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip separator=" " formatter={(v: number) => [`${v} ${unit}`, '']} labelFormatter={(_, p) => p?.[0]?.payload?.label}
                        contentStyle={{ background: 'var(--color-night)', border: 0, borderRadius: 999, color: 'var(--color-linen)', padding: '2px 10px' }} itemStyle={{ color: 'var(--color-linen)' }} labelStyle={{ display: 'none' }} cursor={false} />
                      <Line type="monotone" dataKey="weight" stroke="var(--color-forest)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-forest)' }} activeDot={{ r: 6, stroke: 'var(--color-linen)', strokeWidth: 2 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="pb-2 text-sm text-ink-soft">Add another day’s entry to see a trend.</p>}
            </div>
          ) : (
            <p className="mt-3 text-ink-soft">Your progress journal starts here. Add your first entry whenever you’re ready.</p>
          )}
          <div className="mt-4 flex gap-1.5" aria-hidden>
            {weights.slice(-7).map((w) => <span key={w.date} className="grid size-6 place-items-center rounded-full bg-mint text-forest"><Check size={12} strokeWidth={3} /></span>)}
            {Array.from({ length: Math.max(0, 7 - weights.length) }, (_, i) => <span key={i} className="size-6 rounded-full border border-dashed border-rule" />)}
          </div>
          {weights.length > 0 && <button className="mt-4 text-sm font-semibold text-forest underline decoration-sage decoration-2 underline-offset-4" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>{showAll ? 'Hide entries' : `See all ${weights.length} entries`}</button>}
          <AnimatePresence initial={false}>
            {showAll && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <table className="mt-3 w-full text-left text-sm">
                  <caption className="sr-only">Weight history</caption>
                  <thead className="text-ink-soft"><tr><th className="py-2 font-semibold">Date</th><th className="font-semibold">Weight</th><th className="font-semibold">BMI</th><th><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody className="num">
                    {[...weights].reverse().map((w) => (
                      <tr key={w.date} className="border-t border-rule">
                        <td className="py-1.5">{formatShort(w.date)}</td>
                        <td>{show(w.weightKg)} {unit}</td>
                        <td>{round1(bmi(w.weightKg, profile.heightCm))}</td>
                        <td className="whitespace-nowrap text-right">
                          <button className="rounded-full p-2 text-ink-soft hover:bg-sand" onClick={() => setEditing(w)} aria-label={`Edit entry for ${formatShort(w.date)}`}><Pencil size={15} /></button>
                          <button className="rounded-full p-2 text-ink-soft hover:bg-sand" onClick={() => setDeleting(w)} aria-label={`Delete entry for ${formatShort(w.date)}`}><Trash2 size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* BMI */}
        <section aria-labelledby="bmi-title" className="relative overflow-hidden rounded-[1.75rem] bg-mint p-5">
          <Leaves set="sprig" className="absolute -bottom-2 -right-2 w-28 opacity-70" />
          <h2 id="bmi-title" className="font-semibold">BMI</h2>
          <p className="num mt-1 text-5xl font-semibold tracking-tight">{currentBmi ? round1(currentBmi) : '—'}</p>
          <p className="font-semibold text-forest">{currentBmi ? category ?? 'Age-specific assessment needed' : 'Add a weight entry'}</p>
          <p className="relative mt-3 max-w-md text-sm text-ink-soft">
            {profile.age < 18
              ? 'Adult BMI categories don’t apply under 18. Young people’s BMI is assessed against age- and sex-specific growth charts, so talk to a health professional for a proper reading.'
              : `Weight in kg divided by height in metres squared (height ${Math.round(profile.heightCm)} cm). Adult ranges: under 18.5 underweight, 18.5 to 24.9 healthy, 25 to 29.9 overweight, 30+ obese. A general screening measure only. It doesn’t account for muscle, build or age.`}
          </p>
        </section>
      </div>

      {/* Period stats */}
      <section aria-labelledby="period-title" className="card mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="period-title" className="text-lg font-semibold">{period === 'week' ? 'Week in numbers' : 'Month in numbers'}</h2>
          {period === 'week'
            ? <Stepper label={shownWeek === thisWeek ? 'This week' : formatShort(shownWeek).replace(/ \d{4}$/, '')} onPrev={() => setWeekOf(addDays(shownWeek, -7))} onNext={() => setWeekOf(addDays(shownWeek, 7))} nextDisabled={shownWeek >= thisWeek} />
            : <Stepper label={formatMonth(shownMonth)} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} nextDisabled={shownMonth >= monthKey(h.today)} />}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(period === 'week'
            ? [['Workouts', String(week.workouts)], ['Active days', String(week.activeDays)], ['Planned done', `${week.scheduledDone}/${week.scheduled}`], ['Completion', `${week.consistency}%`], ['Minutes', String(week.minutes)]]
            : [['Workouts', String(mon.workouts)], ['Active days', String(mon.activeDays)], ['Minutes', String(mon.minutes)], ['Consistency', `${mon.consistency}%`], ['Longest streak', `${mon.longestStreak} d`]]
          ).map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-paper px-4 py-3">
              <dt className="text-xs font-semibold text-ink-soft">{k}</dt>
              <dd className="num mt-1 text-2xl font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Suggested stretch */}
      <section className="card mt-4 flex items-center gap-4 overflow-hidden p-4 pr-5">
        <div className="relative w-32 shrink-0 rounded-3xl bg-gradient-to-br from-mint to-sand sm:w-40">
          <Figure move="sideStretch" className="w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Gentle stretch</h2>
          <p className="text-sm text-ink-soft">Hold each stretch for 20 to 30 seconds. {mobility.estimatedDuration} minutes, no equipment.</p>
        </div>
        <Link to="/workouts/mobility" className="grid size-14 shrink-0 place-items-center rounded-full bg-forest text-on-forest shadow-soft" aria-label="See the gentle mobility workout">
          <Play size={20} fill="currentColor" />
        </Link>
      </section>

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add a weight entry">
        <WeightForm onDone={() => setAdding(false)} />
      </Dialog>
      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Edit entry">
        {editing && <WeightForm initial={editing} onDone={() => setEditing(null)} />}
      </Dialog>
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} danger action="Delete entry" title="Delete this entry?"
        body={deleting && `${show(deleting.weightKg)} ${unit} on ${formatShort(deleting.date)} will be removed from your journal.`}
        onConfirm={() => deleting && attempt(() => db.weights.delete(deleting.date), 'Entry deleted')} />
    </div>
  )
}
