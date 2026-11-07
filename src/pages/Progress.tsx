import { useMemo, useState, type FormEvent } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { Confirm, Dialog, Empty, PageHeader, attempt } from '../components/ui'
import { useHistory, useProfile, useWeights } from '../hooks/useData'
import { usePrefs } from '../lib/prefs'
import { db, putWeight } from '../lib/db'
import { bmi, bmiCategory, kgToLb, lbToKg, round1 } from '../lib/health'
import { addDays, formatMonth, formatShort, fromISO, monthKey, startOfWeek } from '../lib/dates'
import { monthStats, weekStats } from '../lib/streak'
import type { WeightEntry } from '../types'

const AXIS = { stroke: 'var(--color-ink-soft)', fontSize: 12, tickLine: false, axisLine: false } as const
const TOOLTIP = {
  separator: ' ',
  contentStyle: { background: 'var(--color-linen)', border: '1px solid var(--color-rule)', borderRadius: 12, color: 'var(--color-ink)' },
  labelStyle: { fontWeight: 600 },
  cursor: { stroke: 'var(--color-rule)', fill: 'var(--color-sand)', fillOpacity: 0.4 },
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="num mt-1 text-3xl font-bold">{value}</dd>
      {note && <dd className="text-sm text-ink-soft">{note}</dd>}
    </div>
  )
}

function Stepper({ label, onPrev, onNext, nextDisabled }: { label: string; onPrev: () => void; onNext: () => void; nextDisabled: boolean }) {
  return (
    <div className="flex items-center">
      <button className="rounded-full p-2.5 hover:bg-sand" onClick={onPrev} aria-label="Previous"><ChevronLeft size={18} /></button>
      <span className="min-w-36 text-center font-semibold" aria-live="polite">{label}</span>
      <button className="rounded-full p-2.5 hover:bg-sand disabled:opacity-30" disabled={nextDisabled} onClick={onNext} aria-label="Next"><ChevronRight size={18} /></button>
    </div>
  )
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
  const { weightUnit: unit } = usePrefs()
  const [weekOf, setWeekOf] = useState<string | null>(null)
  const [month, setMonth] = useState<string | null>(null)
  const [editing, setEditing] = useState<WeightEntry | null>(null)
  const [deleting, setDeleting] = useState<WeightEntry | null>(null)

  const week = useMemo(() => h && weekStats(weekOf ?? h.today, h), [h, weekOf])
  const mon = useMemo(() => h && monthStats(month ?? monthKey(h.today), h), [h, month])
  if (!profile || !weights || !h || !week || !mon) return null

  const show = (kg: number) => round1(unit === 'kg' ? kg : kgToLb(kg))
  const first = weights[0]
  const latest = weights[weights.length - 1]
  const diff = latest && first ? show(latest.weightKg) - show(first.weightKg) : 0
  const current = latest ? bmi(latest.weightKg, profile.heightCm) : null
  const category = current ? bmiCategory(current, profile.age) : null
  const chart = weights.map((w) => ({ date: w.date, label: fromISO(w.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), weight: show(w.weightKg) }))
  const thisWeek = startOfWeek(h.today)
  const shownWeek = startOfWeek(weekOf ?? h.today)
  const shownMonth = month ?? monthKey(h.today)
  const shiftMonth = (d: number) => {
    const [y, m] = shownMonth.split('-').map(Number)
    const x = new Date(y, m - 1 + d, 1)
    setMonth(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div>
      <PageHeader title="Progress" intro="A journal of how you’re getting on. Numbers are just one part of the story." />

      <section aria-labelledby="weight-title">
        <h2 id="weight-title" className="display text-3xl">Weight</h2>
        {weights.length === 0 ? (
          <div className="mt-6"><Empty title="Your progress journal starts here." body="Add your first entry whenever you’re ready." /></div>
        ) : (
          <>
            <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-rule py-5">
              <Stat label="First entry" value={`${show(first.weightKg)} ${unit}`} note={formatShort(first.date)} />
              <Stat label="Latest" value={`${show(latest.weightKg)} ${unit}`} note={formatShort(latest.date)} />
              <Stat label="Change" value={`${diff > 0 ? '+' : diff < 0 ? '−' : ''}${round1(Math.abs(diff))} ${unit}`} note="since your first entry" />
            </dl>
            {chart.length > 1 ? (
              <div className="mt-6 h-64" role="img" aria-label={`Weight chart from ${chart[0].weight} to ${chart[chart.length - 1].weight} ${unit}. The full list is below.`}>
                <ResponsiveContainer>
                  <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-rule)" strokeOpacity={0.5} />
                    <XAxis dataKey="label" {...AXIS} minTickGap={24} />
                    <YAxis {...AXIS} domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={(v: number) => String(Math.round(v))} width={48} />
                    <Tooltip {...TOOLTIP} formatter={(v: number) => [`${v} ${unit}`, 'Weight']} />
                    <Line type="monotone" dataKey="weight" stroke="var(--color-moss)" strokeWidth={2} dot={{ r: 4, fill: 'var(--color-moss)', stroke: 'var(--color-paper)', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="mt-6 text-ink-soft">Add another entry on a different day to see your chart.</p>}
          </>
        )}

        <div className="mt-8 rounded-3xl bg-linen p-6">
          <h3 className="mb-4 font-semibold">Add an entry</h3>
          <WeightForm onDone={() => {}} />
        </div>

        {weights.length > 0 && (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[22rem] text-left">
              <caption className="sr-only">Weight history</caption>
              <thead className="text-sm text-ink-soft">
                <tr className="border-b border-rule"><th className="py-2 font-semibold">Date</th><th className="font-semibold">Weight</th><th className="font-semibold">BMI</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="num">
                {[...weights].reverse().map((w) => (
                  <tr key={w.date} className="border-b border-rule">
                    <td className="py-2">{formatShort(w.date)}</td>
                    <td>{show(w.weightKg)} {unit}</td>
                    <td>{round1(bmi(w.weightKg, profile.heightCm))}</td>
                    <td className="text-right whitespace-nowrap">
                      <button className="rounded-full p-2.5 text-ink-soft hover:bg-sand" onClick={() => setEditing(w)} aria-label={`Edit entry for ${formatShort(w.date)}`}><Pencil size={16} /></button>
                      <button className="rounded-full p-2.5 text-ink-soft hover:bg-sand" onClick={() => setDeleting(w)} aria-label={`Delete entry for ${formatShort(w.date)}`}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="bmi-title" className="mt-16 grid gap-6 md:grid-cols-[auto_1fr] md:gap-12">
        <div>
          <h2 id="bmi-title" className="display text-3xl">BMI</h2>
          <p className="num mt-3 font-display text-6xl">{current ? round1(current) : '—'}</p>
          <p className="mt-1 font-semibold">{current ? category ?? 'Age-specific assessment needed' : 'Add a weight entry'}</p>
        </div>
        <div className="max-w-lg text-ink-soft md:pt-12">
          <p>BMI is your weight in kilograms divided by your height in metres squared, using your latest entry and a height of {Math.round(profile.heightCm)} cm.</p>
          <p className="mt-3">
            {profile.age < 18
              ? 'Adult BMI categories don’t apply under 18. Young people’s BMI is assessed against age- and sex-specific growth charts, so talk to a health professional for a proper reading.'
              : 'Adult categories: under 18.5 underweight, 18.5 to 24.9 healthy, 25 to 29.9 overweight, 30 and above obese. BMI is a general screening measure. It doesn’t account for muscle, build or age, and it isn’t a full health assessment.'}
          </p>
        </div>
      </section>

      <section aria-labelledby="week-title" className="mt-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="week-title" className="display text-3xl">Week</h2>
          <Stepper label={shownWeek === thisWeek ? 'This week' : `Week of ${formatShort(shownWeek)}`}
            onPrev={() => setWeekOf(addDays(shownWeek, -7))} onNext={() => setWeekOf(addDays(shownWeek, 7))} nextDisabled={shownWeek >= thisWeek} />
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-6 border-y border-rule py-5 sm:grid-cols-4">
          <Stat label="Workouts done" value={String(week.workouts)} />
          <Stat label="Planned days" value={`${week.scheduledDone} of ${week.scheduled}`} note="so far" />
          <Stat label="Completion" value={`${week.consistency}%`} />
          <Stat label="Time moving" value={`${week.minutes} min`} />
        </dl>
        <div className="mt-6 h-52" role="img" aria-label={`Minutes per day: ${week.days.map((d) => `${fromISO(d.date).toLocaleDateString('en-GB', { weekday: 'short' })} ${d.minutes}`).join(', ')}`}>
          <ResponsiveContainer>
            <BarChart data={week.days.map((d) => ({ day: fromISO(d.date).toLocaleDateString('en-GB', { weekday: 'short' }), minutes: d.minutes }))} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--color-rule)" strokeOpacity={0.5} />
              <XAxis dataKey="day" {...AXIS} />
              <YAxis {...AXIS} allowDecimals={false} width={44} />
              <Tooltip {...TOOLTIP} formatter={(v: number) => [`${v} min`, 'Time']} />
              <Bar dataKey="minutes" fill="var(--color-forest)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section aria-labelledby="month-title" className="mt-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="month-title" className="display text-3xl">Month</h2>
          <Stepper label={formatMonth(shownMonth)} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} nextDisabled={shownMonth >= monthKey(h.today)} />
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-6 border-y border-rule py-5 sm:grid-cols-5">
          <Stat label="Workouts" value={String(mon.workouts)} />
          <Stat label="Active days" value={String(mon.activeDays)} />
          <Stat label="Minutes" value={String(mon.minutes)} />
          <Stat label="Consistency" value={`${mon.consistency}%`} note="of planned days" />
          <Stat label="Longest streak" value={`${mon.longestStreak} ${mon.longestStreak === 1 ? 'day' : 'days'}`} />
        </dl>
      </section>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Edit entry">
        {editing && <WeightForm initial={editing} onDone={() => setEditing(null)} />}
      </Dialog>
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} danger action="Delete entry" title="Delete this entry?"
        body={deleting && `${show(deleting.weightKg)} ${unit} on ${formatShort(deleting.date)} will be removed from your journal.`}
        onConfirm={() => deleting && attempt(() => db.weights.delete(deleting.date), 'Entry deleted')} />
    </div>
  )
}
