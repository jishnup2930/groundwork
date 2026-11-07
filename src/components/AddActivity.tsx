import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { ACTIVITIES, KM_CHOICES, MINUTE_CHOICES } from '../data/activities'
import { logActivity } from '../lib/db'
import { addDays, today } from '../lib/dates'
import { attempt, radioKeys, rovingTab, Segmented, toast } from './ui'
import { useLogWithCelebration } from '../hooks/useLogging'

function Chips<T extends number>({ values, value, onPick, unit, label }: { values: T[]; value: T | null; onPick: (v: T) => void; unit: string; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={radioKeys} className="flex flex-wrap gap-2">
      {values.map((v, i) => (
        <button key={v} role="radio" aria-checked={value === v} tabIndex={rovingTab(value === v, i, value !== null)} onClick={() => onPick(v)}
          className={`chip min-h-10 px-4 text-sm ${value === v ? 'bg-forest text-on-forest' : 'bg-paper text-ink'}`}>{v} {unit}</button>
      ))}
    </div>
  )
}

function Stepper({ value, step, unit, onChange, min }: { value: number; step: number; unit: string; onChange: (v: number) => void; min: number }) {
  return (
    <div className="mt-3 flex items-center gap-3">
      <button className="grid size-11 place-items-center rounded-full border border-rule" onClick={() => onChange(Math.max(min, value - step))} aria-label={`Less, ${step} ${unit}`}><Minus size={18} /></button>
      <span className="num min-w-24 text-center text-3xl font-semibold" aria-live="polite">{value}<span className="ml-1 text-base text-ink-soft">{unit}</span></span>
      <button className="grid size-11 place-items-center rounded-full border border-rule" onClick={() => onChange(value + step)} aria-label={`More, ${step} ${unit}`}><Plus size={18} /></button>
    </div>
  )
}

/** Log an everyday activity in a few taps: type, amount, save. */
export function AddActivity({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState(ACTIVITIES[0])
  const [mode, setMode] = useState<'km' | 'min'>('km')
  const [km, setKm] = useState<number | null>(null)
  const [mins, setMins] = useState<number | null>(null)
  const [when, setWhen] = useState<'today' | 'yesterday'>('today')
  const log = useLogWithCelebration()
  const byKm = type.byDistance && mode === 'km'
  const ready = byKm ? !!km : !!mins

  const save = async () => {
    if (!ready) return
    const minutes = byKm ? km! * (type.minPerKm ?? 10) : mins!
    const date = when === 'today' ? today() : addDays(today(), -1)
    const ok = await attempt(() => log(() => logActivity(type, date, minutes, byKm ? km! : undefined)).then(() => true))
    if (ok) { toast(`${type.label} logged: ${byKm ? `${km} km` : `${mins} min`}`); onDone() }
  }

  return (
    <div className="grid gap-5">
      <div role="radiogroup" aria-label="Activity" onKeyDown={radioKeys} className="flex flex-wrap gap-2">
        {ACTIVITIES.map((a, i) => (
          <button key={a.id} role="radio" aria-checked={type.id === a.id} tabIndex={rovingTab(type.id === a.id, i, true)} onClick={() => { setType(a); if (!a.byDistance) setMode('min') }}
            className={`chip min-h-11 px-4 text-sm ${type.id === a.id ? 'bg-night text-on-forest' : 'bg-paper text-ink'}`}>{a.label}</button>
        ))}
      </div>

      {type.byDistance && (
        <Segmented label="Log by" value={mode} onChange={setMode} options={[{ value: 'km', label: 'Distance' }, { value: 'min', label: 'Time' }]} />
      )}

      {byKm ? (
        <div>
          <Chips label="Distance" values={KM_CHOICES} value={km} onPick={setKm} unit="km" />
          {km !== null && <Stepper value={km} step={0.5} min={0.5} unit="km" onChange={setKm} />}
        </div>
      ) : (
        <div>
          <Chips label="Time" values={MINUTE_CHOICES} value={mins} onPick={setMins} unit="min" />
          {mins !== null && <Stepper value={mins} step={5} min={5} unit="min" onChange={setMins} />}
        </div>
      )}

      <Segmented label="When" value={when} onChange={setWhen} options={[{ value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' }]} />

      <button className="btn-primary" disabled={!ready} onClick={save}>
        {ready ? `Save ${type.label.toLowerCase()}${byKm ? `, ${km} km` : `, ${mins} min`}` : 'Pick a distance or time'}
      </button>
    </div>
  )
}
