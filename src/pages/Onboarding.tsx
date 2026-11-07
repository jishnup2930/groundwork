import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { Figure } from '../components/Figure'
import { Wordmark } from '../components/Layout'
import { attempt } from '../components/ui'
import { completeOnboarding } from '../lib/db'
import { DEFAULT_WEEK } from '../data/workouts'
import type { FitnessGoal, FitnessLevel } from '../types'

export const GOALS: { value: FitnessGoal; label: string; detail: string }[] = [
  { value: 'general', label: 'General fitness', detail: 'Build a healthier, stronger and more active lifestyle.' },
  { value: 'weight-loss', label: 'Weight loss', detail: 'Move more and build habits that support a healthy weight.' },
  { value: 'muscle', label: 'Muscle building', detail: 'Get stronger and add some muscle over time.' },
  { value: 'strength', label: 'Strength and endurance', detail: 'Last longer and feel capable in everyday life.' },
  { value: 'mobility', label: 'Flexibility and mobility', detail: 'Move more freely and ease stiffness.' },
]

export const LEVELS: { value: FitnessLevel; label: string; detail: string }[] = [
  { value: 'beginner', label: 'Beginner', detail: 'New to exercise, or coming back after a long break.' },
  { value: 'intermediate', label: 'Intermediate', detail: 'You exercise now and then and know the basics.' },
  { value: 'advanced', label: 'Advanced', detail: 'You train regularly and want more volume.' },
]

export function Landscape({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] bg-[#e7dcc6] dark:bg-forest-deep ${className}`}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <circle cx="270" cy="105" r="42" fill="var(--color-clay)" opacity="0.9" />
        <path d="M0 190 C80 150 150 165 220 185 S340 160 400 170 V300 H0Z" fill="var(--color-sage)" />
        <path d="M0 225 C90 195 170 205 250 225 S360 215 400 205 V300 H0Z" fill="var(--color-moss)" />
        <path d="M0 262 C100 240 210 245 300 262 S380 262 400 255 V300 H0Z" fill="var(--color-forest)" />
      </svg>
      <Figure move="sideStretch" animate tone="paper" className="absolute bottom-[4%] left-[6%] w-[62%]" />
    </div>
  )
}

function Choice({ checked, onSelect, label, detail }: { checked: boolean; onSelect: () => void; label: string; detail: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onSelect}
      className={`flex w-full items-start gap-4 rounded-2xl border px-5 py-4 text-left transition-colors ${checked ? 'border-forest bg-linen' : 'border-rule hover:bg-linen/60'}`}>
      <span className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border-2 ${checked ? 'border-forest bg-forest text-on-forest' : 'border-rule'}`}>
        {checked && <Check size={12} strokeWidth={3.5} />}
      </span>
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-ink-soft">{detail}</span>
      </span>
    </button>
  )
}

export interface ProfileDraft { name: string; age: string; height: string; weight: string }

export function validateDraft(d: ProfileDraft) {
  const e: Partial<Record<keyof ProfileDraft, string>> = {}
  const num = (s: string) => (s.trim() === '' ? NaN : Number(s))
  if (!d.name.trim()) e.name = 'Enter your name so we know what to call you.'
  const age = num(d.age)
  if (!Number.isInteger(age) || age < 10 || age > 120) e.age = 'Enter your age in whole years, between 10 and 120.'
  const h = num(d.height)
  if (!(h >= 100 && h <= 250)) e.height = 'Enter a height between 100 and 250 cm.'
  const w = num(d.weight)
  if (!(w >= 25 && w <= 350)) e.weight = 'Enter a weight between 25 and 350 kg.'
  return e
}

function Field({ id, label, error, suffix, ...rest }: { id: string; label: string; error?: string; suffix?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input id={id} className={`field ${suffix ? 'pr-14' : ''} ${error ? 'border-clay' : ''}`} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-ink-soft">{suffix}</span>}
      </div>
      {error && <p id={`${id}-err`} className="mt-1.5 text-sm text-clay">{error}</p>}
    </div>
  )
}

export function Onboarding() {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<ProfileDraft>({ name: '', age: '', height: '', weight: '' })
  const [errors, setErrors] = useState<ReturnType<typeof validateDraft>>({})
  const [goal, setGoal] = useState<FitnessGoal>('general')
  const [level, setLevel] = useState<FitnessLevel>('beginner')
  const [saving, setSaving] = useState(false)
  const first = draft.name.trim().split(' ')[0]

  const next = () => setStep((s) => s + 1)
  const submitDetails = (e: FormEvent) => {
    e.preventDefault()
    const errs = validateDraft(draft)
    setErrors(errs)
    if (Object.keys(errs).length) document.getElementById(Object.keys(errs)[0])?.focus()
    else next()
  }
  const finish = async () => {
    setSaving(true)
    const ok = await attempt(() =>
      completeOnboarding(
        { name: draft.name.trim(), age: Number(draft.age), heightCm: Number(draft.height), fitnessGoal: goal, fitnessLevel: level, equipment: 'bodyweight' },
        Number(draft.weight),
        DEFAULT_WEEK,
      ).then(() => true),
    )
    setSaving(false)
    if (ok) nav('/', { replace: true })
  }

  if (step === 0)
    return (
      <div className="mx-auto grid min-h-dvh max-w-6xl content-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16">
        <Landscape className="rise aspect-[4/3] lg:order-2 lg:aspect-[4/5]" />
        <div className="rise" style={{ animationDelay: '120ms' }}>
          <Wordmark className="text-xl" />
          <h1 className="display mt-10 text-5xl sm:text-6xl lg:text-7xl">Your journey starts with one small step.</h1>
          <p className="mt-6 max-w-md text-lg text-ink-soft">
            This is your space to grow stronger, build consistency, and celebrate every little win.
          </p>
          <button className="btn-primary mt-10 px-8 text-lg" onClick={next}>Get started</button>
          <p className="mt-6 text-sm text-ink-soft">No account needed. Everything stays on this device.</p>
        </div>
      </div>
    )

  if (step === 5)
    return (
      <div className="mx-auto grid min-h-dvh max-w-xl content-center px-5 py-10 text-center">
        <Figure move="armCircles" animate className="rise mx-auto w-56" />
        <h1 className="display rise mt-6 text-5xl sm:text-6xl" style={{ animationDelay: '100ms' }}>Welcome, {first}!</h1>
        <p className="rise mt-5 text-lg text-ink-soft" style={{ animationDelay: '200ms' }}>Your journey starts today. Let’s make every day count.</p>
        <div className="rise mt-10" style={{ animationDelay: '300ms' }}>
          <button className="btn-primary px-8 text-lg" onClick={finish} disabled={saving}>
            {saving ? 'Setting up…' : 'Enter my fitness space'}
          </button>
        </div>
      </div>
    )

  const steps: Record<number, { title: string; body: ReactNode }> = {
    1: {
      title: 'First, a little about you',
      body: (
        <form id="details" onSubmit={submitDetails} noValidate className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="name" label="Your name" autoComplete="given-name" value={draft.name} error={errors.name} maxLength={60}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <Field id="age" label="Age" inputMode="numeric" suffix="yrs" value={draft.age} error={errors.age}
            onChange={(e) => setDraft({ ...draft, age: e.target.value })} />
          <Field id="height" label="Height" inputMode="decimal" suffix="cm" value={draft.height} error={errors.height}
            onChange={(e) => setDraft({ ...draft, height: e.target.value })} />
          <Field id="weight" label="Current weight" inputMode="decimal" suffix="kg" value={draft.weight} error={errors.weight}
            onChange={(e) => setDraft({ ...draft, weight: e.target.value })} />
          <p className="self-end text-sm text-ink-soft sm:pb-3">Prefer pounds or feet and inches? You can switch in your profile later.</p>
        </form>
      ),
    },
    2: {
      title: 'What would you like to work towards?',
      body: (
        <div role="radiogroup" aria-label="Fitness goal" className="grid gap-3">
          {GOALS.map((g) => <Choice key={g.value} checked={goal === g.value} onSelect={() => setGoal(g.value)} label={g.label} detail={g.detail} />)}
        </div>
      ),
    },
    3: {
      title: 'How much exercise do you do now?',
      body: (
        <div role="radiogroup" aria-label="Fitness experience" className="grid gap-3">
          {LEVELS.map((l) => <Choice key={l.value} checked={level === l.value} onSelect={() => setLevel(l.value)} label={l.label} detail={l.detail} />)}
          <p className="mt-2 text-sm text-ink-soft">Workouts adjust their sets and reps to match.</p>
        </div>
      ),
    },
    4: {
      title: 'All you need is a little floor space',
      body: (
        <div className="grid gap-6 sm:grid-cols-[1fr_12rem] sm:items-center">
          <div>
            <Choice checked onSelect={() => {}} label="No equipment" detail="Bodyweight workouts at home." />
            <p className="mt-5 text-ink-soft">
              Every workout uses your own body weight. A wall, a sturdy chair and a soft surface to lie on are all you’ll need.
            </p>
          </div>
          <Figure move="bridge" className="hidden w-full sm:block" />
        </div>
      ),
    },
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <button onClick={() => setStep((s) => s - 1)} className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-semibold text-ink-soft hover:text-ink">
          <ArrowLeft size={18} aria-hidden /> Back
        </button>
        <p className="text-sm font-semibold text-ink-soft">Step {step} of 4</p>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => <span key={i} className={`h-1 rounded-full ${i <= step ? 'bg-forest' : 'bg-sand'}`} />)}
      </div>
      <h1 key={step} className="display rise mt-12 mb-8 text-4xl sm:text-5xl">{steps[step].title}</h1>
      <div className="flex-1">{steps[step].body}</div>
      <div className="sticky bottom-0 mt-10 bg-paper/90 py-4 backdrop-blur">
        {step === 1
          ? <button form="details" type="submit" className="btn-primary w-full sm:w-auto sm:px-10">Continue</button>
          : <button onClick={next} className="btn-primary w-full sm:w-auto sm:px-10">Continue</button>}
      </div>
    </div>
  )
}
