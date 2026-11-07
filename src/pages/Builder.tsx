import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Figure } from '../components/Figure'
import { Dialog, Empty, attempt } from '../components/ui'
import { useCustomWorkouts } from '../hooks/useData'
import { saveCustomWorkout } from '../lib/db'
import { EXERCISES } from '../data/exercises'
import { CATEGORY_LABEL, estimateMinutes } from '../data/workouts'
import type { Category, Difficulty, Exercise, Workout } from '../types'

type Row = Exercise & { mode: 'reps' | 'duration' }

const LIBRARY = Object.entries(EXERCISES).map(([id, e]) => ({ id, ...e }))

const blank = (): Row => ({
  id: `own-${crypto.randomUUID()}`, name: '', description: '', instructions: [], muscleGroup: 'Your choice',
  sets: 2, reps: 10, restDuration: 30, difficulty: 'beginner', modification: '', mode: 'reps',
})

export function validateWorkout(name: string, rows: Row[]): string | null {
  if (!name.trim()) return 'Give your workout a name.'
  if (!rows.length) return 'Add at least one exercise.'
  for (const [i, r] of rows.entries()) {
    const label = r.name.trim() || `Exercise ${i + 1}`
    if (!r.name.trim()) return `Exercise ${i + 1} needs a name.`
    if (!(Number.isInteger(r.sets) && r.sets >= 1 && r.sets <= 10)) return `${label}: sets must be between 1 and 10.`
    if (r.mode === 'reps' && !(Number.isInteger(r.reps) && r.reps! >= 1 && r.reps! <= 100)) return `${label}: reps must be between 1 and 100.`
    if (r.mode === 'duration' && !(Number.isInteger(r.duration) && r.duration! >= 5 && r.duration! <= 600)) return `${label}: time must be between 5 and 600 seconds.`
    if (!(Number.isInteger(r.restDuration) && r.restDuration >= 0 && r.restDuration <= 300)) return `${label}: rest must be between 0 and 300 seconds.`
  }
  return null
}

function NumberInput({ label, value, onChange, suffix }: { label: string; value: number | undefined; onChange: (n: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <input type="number" inputMode="numeric" min={0} className="field num pr-10" value={Number.isNaN(value) ? '' : value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm text-ink-soft">{suffix}</span>}
      </span>
    </label>
  )
}

export function Builder() {
  const { id } = useParams()
  const nav = useNavigate()
  const custom = useCustomWorkouts()
  const existing = id ? custom?.find((w) => w.id === id) : undefined
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('full-body')
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [rows, setRows] = useState<Row[]>([])
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(!id)

  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name); setDescription(existing.description); setCategory(existing.category); setDifficulty(existing.difficulty)
      setRows(existing.exercises.map((e) => ({ ...e, mode: e.duration ? 'duration' : 'reps' })))
      setLoaded(true)
    }
  }, [existing, loaded])

  if (id && custom && !existing) return <Empty title="This workout isn’t here any more." body="It may have been deleted. Plenty of others are ready when you are."><Link to="/workouts" className="btn-primary">See all workouts</Link></Empty>
  if (!loaded) return null

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const move = (i: number, d: number) => setRows((r) => {
    const n = [...r]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const err = validateWorkout(name, rows)
    setError(err)
    if (err) return
    const exercises: Exercise[] = rows.map(({ mode, ...r }) => ({
      ...r, name: r.name.trim(),
      reps: mode === 'reps' ? r.reps : undefined,
      duration: mode === 'duration' ? r.duration : undefined,
    }))
    const w: Workout = {
      id: existing?.id ?? `custom-${crypto.randomUUID()}`, name: name.trim(), description: description.trim(), category, difficulty,
      exercises, isCustom: true, estimatedDuration: estimateMinutes(exercises), createdAt: existing?.createdAt,
    }
    if (await attempt(() => saveCustomWorkout(w).then(() => true), existing ? 'Changes saved' : 'Workout created')) nav(`/workouts/${w.id}`)
  }

  return (
    <form onSubmit={submit} noValidate>
      <Link to={existing ? `/workouts/${existing.id}` : '/workouts'} className="-ml-1 inline-flex min-h-11 items-center gap-1.5 font-semibold text-ink-soft hover:text-ink"><ArrowLeft size={18} aria-hidden /> Back</Link>
      <h1 className="display mt-4 text-4xl sm:text-5xl">{existing ? 'Edit workout' : 'Create a workout'}</h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <label className="block sm:col-span-2"><span className="label">Name</span>
          <input className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Morning wake-up" />
        </label>
        <label className="block sm:col-span-2"><span className="label">Description (optional)</span>
          <textarea className="field min-h-24 py-3" value={description} maxLength={240} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="block"><span className="label">Category</span>
          <select className="field" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block"><span className="label">Difficulty</span>
          <select className="field" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
          </select>
        </label>
      </div>

      <div className="mt-12 flex items-baseline justify-between gap-4 border-b border-rule pb-3">
        <h2 className="display text-2xl">Exercises</h2>
        {rows.length > 0 && <span className="num text-sm text-ink-soft">About {estimateMinutes(rows.filter((r) => r.sets > 0))} min</span>}
      </div>
      {rows.length === 0 && <p className="py-6 text-ink-soft">No exercises yet. Add a few from the library or write your own.</p>}
      <ol>
        {rows.map((r, i) => (
          <li key={r.id + i} className="border-b border-rule py-5">
            <div className="flex items-start gap-3">
              <span className="w-14 shrink-0 rounded-xl bg-linen"><Figure move={r.pose} /></span>
              <label className="block min-w-0 flex-1"><span className="sr-only">Exercise {i + 1} name</span>
                <input className="field font-semibold" value={r.name} maxLength={60} placeholder="Exercise name" onChange={(e) => update(i, { name: e.target.value })} />
              </label>
              <div className="flex shrink-0">
                <button type="button" className="rounded-full p-3 text-ink-soft hover:bg-sand disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${r.name || 'exercise'} up`}><ArrowUp size={18} /></button>
                <button type="button" className="rounded-full p-3 text-ink-soft hover:bg-sand disabled:opacity-30" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${r.name || 'exercise'} down`}><ArrowDown size={18} /></button>
                <button type="button" className="rounded-full p-3 text-ink-soft hover:bg-sand" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`Remove ${r.name || 'exercise'}`}><Trash2 size={18} /></button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:pl-17">
              <NumberInput label="Sets" value={r.sets} onChange={(n) => update(i, { sets: n })} />
              <label className="block"><span className="label">Measure by</span>
                <select className="field" value={r.mode} onChange={(e) => {
                  const mode = e.target.value as Row['mode']
                  update(i, mode === 'reps' ? { mode, reps: r.reps ?? 10 } : { mode, duration: r.duration ?? 30 })
                }}>
                  <option value="reps">Reps</option><option value="duration">Time</option>
                </select>
              </label>
              {r.mode === 'reps'
                ? <NumberInput label="Reps" value={r.reps} onChange={(n) => update(i, { reps: n })} />
                : <NumberInput label="Time" suffix="sec" value={r.duration} onChange={(n) => update(i, { duration: n })} />}
              <NumberInput label="Rest" suffix="sec" value={r.restDuration} onChange={(n) => update(i, { restDuration: n })} />
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="btn-ghost mt-5" onClick={() => setPicking(true)}><Plus size={18} aria-hidden /> Add exercise</button>

      {error && <p role="alert" className="mt-6 rounded-2xl border border-clay/50 px-5 py-3 text-clay">{error}</p>}
      <div className="mt-10 flex flex-wrap gap-3 border-t border-rule pt-6">
        <button type="submit" className="btn-primary px-8">{existing ? 'Save changes' : 'Save workout'}</button>
        <Link to={existing ? `/workouts/${existing.id}` : '/workouts'} className="btn-ghost">Cancel</Link>
      </div>

      <Dialog open={picking} onClose={() => setPicking(false)} title="Add an exercise" wide>
        <button type="button" className="btn-primary mb-4 w-full" onClick={() => { setRows([...rows, blank()]); setPicking(false) }}>
          <Plus size={18} aria-hidden /> Write your own
        </button>
        <ul className="max-h-[55vh] overflow-y-auto border-t border-rule">
          {LIBRARY.map((e) => (
            <li key={e.id}>
              <button type="button" className="flex w-full items-center gap-4 border-b border-rule py-3 text-left hover:bg-sand/40"
                onClick={() => { setRows([...rows, { ...e, id: e.id, mode: e.duration ? 'duration' : 'reps' }]); setPicking(false) }}>
                <span className="w-14 shrink-0 rounded-xl bg-paper"><Figure move={e.pose} /></span>
                <span><span className="block font-semibold">{e.name}</span><span className="block text-sm text-ink-soft">{e.muscleGroup}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </form>
  )
}
