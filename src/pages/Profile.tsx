import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Upload, Pencil } from 'lucide-react'
import { Confirm, Dialog, PageHeader, Segmented, attempt, toast } from '../components/ui'
import { useProfile, useWeights } from '../hooks/useData'
import { clearPrefs, setPrefs, usePrefs } from '../lib/prefs'
import { putWeight, resetAll, updateProfile } from '../lib/db'
import { downloadJSON, exportData, importData, parseBackup, type Backup } from '../lib/backup'
import { cmToFtIn, formatHeight, formatWeight, ftInToCm, kgToLb, lbToKg, round1 } from '../lib/health'
import { today, formatShort } from '../lib/dates'
import { GOALS, LEVELS, validateDraft } from './Onboarding'
import type { FitnessGoal, FitnessLevel, UserProfile } from '../types'

function EditProfile({ profile, weightKg, onDone }: { profile: UserProfile; weightKg?: number; onDone: () => void }) {
  const prefs = usePrefs()
  const ftin = cmToFtIn(profile.heightCm)
  const [name, setName] = useState(profile.name)
  const [age, setAge] = useState(String(profile.age))
  const [cm, setCm] = useState(String(Math.round(profile.heightCm)))
  const [ft, setFt] = useState(String(ftin.ft))
  const [inch, setInch] = useState(String(ftin.inch))
  const [weight, setWeight] = useState(weightKg ? String(round1(prefs.weightUnit === 'kg' ? weightKg : kgToLb(weightKg))) : '')
  const [goal, setGoal] = useState<FitnessGoal>(profile.fitnessGoal)
  const [level, setLevel] = useState<FitnessLevel>(profile.fitnessLevel)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const heightCm = prefs.heightUnit === 'cm' ? Number(cm) : ftInToCm(Number(ft), Number(inch))
    const kg = prefs.weightUnit === 'kg' ? Number(weight) : lbToKg(Number(weight))
    const errs = validateDraft({ name, age, height: String(heightCm || ''), weight: String(kg || '') })
    if (prefs.heightUnit === 'ftin' && errs.height) errs.height = 'Enter a height between 3 ft 4 in and 8 ft 2 in.'
    if (prefs.weightUnit === 'lb' && errs.weight) errs.weight = 'Enter a weight between 55 and 770 lb.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const ok = await attempt(async () => {
      await updateProfile({ name: name.trim(), age: Number(age), heightCm, fitnessGoal: goal, fitnessLevel: level })
      if (weightKg === undefined || Math.abs(kg - weightKg) > 0.01) await putWeight(today(), Math.round(kg * 100) / 100)
      return true
    }, 'Profile saved')
    if (ok) onDone()
  }

  const err = (k: string) => errors[k] && <p className="mt-1 text-sm text-clay">{errors[k]}</p>
  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-2"><span className="label">Name</span><input className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />{err('name')}</label>
      <label className="block"><span className="label">Age</span><input className="field num" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />{err('age')}</label>
      {prefs.heightUnit === 'cm' ? (
        <label className="block"><span className="label">Height (cm)</span><input className="field num" inputMode="decimal" value={cm} onChange={(e) => setCm(e.target.value)} />{err('height')}</label>
      ) : (
        <fieldset><legend className="label">Height</legend>
          <div className="flex gap-2">
            <label className="flex-1"><span className="sr-only">Feet</span><input className="field num" inputMode="numeric" value={ft} onChange={(e) => setFt(e.target.value)} aria-describedby="ft" /></label><span id="ft" className="self-center text-ink-soft">ft</span>
            <label className="flex-1"><span className="sr-only">Inches</span><input className="field num" inputMode="numeric" value={inch} onChange={(e) => setInch(e.target.value)} /></label><span className="self-center text-ink-soft">in</span>
          </div>{err('height')}
        </fieldset>
      )}
      <label className="block"><span className="label">Current weight ({prefs.weightUnit})</span><input className="field num" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />{err('weight')}</label>
      <label className="block"><span className="label">Goal</span>
        <select className="field" value={goal} onChange={(e) => setGoal(e.target.value as FitnessGoal)}>{GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select>
      </label>
      <label className="block"><span className="label">Experience</span>
        <select className="field" value={level} onChange={(e) => setLevel(e.target.value as FitnessLevel)}>{LEVELS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select>
      </label>
      <p className="text-sm text-ink-soft sm:col-span-2">A changed weight is added to your progress journal for today.</p>
      <div className="flex justify-end gap-3 sm:col-span-2">
        <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn-primary">Save profile</button>
      </div>
    </form>
  )
}

export function Profile() {
  const profile = useProfile()
  const weights = useWeights()
  const prefs = usePrefs()
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState<Backup | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [importError, setImportError] = useState('')
  if (!profile || !weights) return null

  const latest = weights[weights.length - 1]
  const rows: [string, string][] = [
    ['Name', profile.name],
    ['Age', `${profile.age}`],
    ['Height', formatHeight(profile.heightCm, prefs.heightUnit)],
    ['Current weight', latest ? formatWeight(latest.weightKg, prefs.weightUnit) : 'Not recorded'],
    ['Goal', GOALS.find((g) => g.value === profile.fitnessGoal)!.label],
    ['Experience', LEVELS.find((l) => l.value === profile.fitnessLevel)!.label],
    ['Equipment', 'None, bodyweight at home'],
    ['Started', formatShort(profile.startDate)],
  ]

  const onFile = async (f: File | undefined) => {
    setImportError('')
    if (!f) return
    try {
      setPending(parseBackup(await f.text()))
    } catch (e) {
      setImportError((e as Error).message)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const enableReminder = async (on: boolean) => {
    setPrefs({ reminder: { ...prefs.reminder, enabled: on } })
  }

  return (
    <div>
      <PageHeader title="Profile" intro="Your details, your settings, and your data.">
        <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil size={16} aria-hidden /> Edit profile</button>
      </PageHeader>

      <dl className="grid gap-x-12 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-rule py-3">
            <dt className="text-ink-soft">{k}</dt><dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="settings-title" className="mt-16">
        <h2 id="settings-title" className="display text-3xl">Settings</h2>
        <div className="mt-6 divide-y divide-rule border-y border-rule">
          {[
            ['Weight', <Segmented key="w" label="Weight unit" value={prefs.weightUnit} onChange={(v) => setPrefs({ weightUnit: v })} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />],
            ['Height', <Segmented key="h" label="Height unit" value={prefs.heightUnit} onChange={(v) => setPrefs({ heightUnit: v })} options={[{ value: 'cm', label: 'cm' }, { value: 'ftin', label: 'ft and in' }]} />],
            ['Theme', <Segmented key="t" label="Theme" value={prefs.theme} onChange={(v) => setPrefs({ theme: v })} options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />],
          ].map(([label, control]) => (
            <div key={label as string} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <span className="font-semibold">{label}</span>{control}
            </div>
          ))}
          <div className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="reminder" className="font-semibold">Daily reminder</label>
              <div className="flex items-center gap-3">
                <input type="time" aria-label="Reminder time" className="field min-h-11 w-auto" value={prefs.reminder.time} disabled={!prefs.reminder.enabled}
                  onChange={(e) => setPrefs({ reminder: { ...prefs.reminder, time: e.target.value || '18:00' } })} />
                <input id="reminder" type="checkbox" className="size-6 accent-[var(--color-forest)]" checked={prefs.reminder.enabled} onChange={(e) => enableReminder(e.target.checked)} />
              </div>
            </div>
            <p className="mt-2 max-w-xl text-sm text-ink-soft">
              After this time, Home shows a gentle note if today’s workout isn’t done yet. Without a server, a closed app can’t send notifications, so the reminder appears only when you open Groundwork.
            </p>
          </div>
        </div>
      </section>

      <section id="data" aria-labelledby="data-title" className="mt-16 scroll-mt-8">
        <h2 id="data-title" className="display text-3xl">Your data</h2>
        <p className="mt-3 max-w-xl text-ink-soft">
          Everything is stored in this browser on this device. Nothing is sent anywhere and nothing syncs between devices. Clearing your browser data or uninstalling the app can erase it, so export a backup now and then.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={async () => {
            const data = await attempt(exportData)
            if (data) { downloadJSON(data, `groundwork-backup-${today()}.json`); toast('Backup downloaded') }
          }}><Download size={18} aria-hidden /> Export backup</button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={18} aria-hidden /> Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        {importError && (
          <p role="alert" className="mt-4 max-w-xl text-clay">
            {importError} <span className="text-ink-soft">Nothing on this device was changed.</span>
          </p>
        )}

        <div className="mt-12 border-t border-rule pt-6">
          <h3 className="font-semibold">Start over</h3>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">Permanently delete your profile, history, weight entries and custom workouts from this device.</p>
          <button className="btn-ghost mt-4 border-clay/50 text-clay" onClick={() => setResetOpen(true)}>Delete all data</button>
        </div>
      </section>

      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit profile" wide>
        <EditProfile profile={profile} weightKg={latest?.weightKg} onDone={() => setEditing(false)} />
      </Dialog>

      <Confirm open={!!pending} onClose={() => setPending(null)} action="Replace my data" title="Replace everything with this backup?"
        body={pending && (
          <>
            <p>This backup from {new Date(pending.exportedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} contains {pending.sessions.length} workouts, {pending.weights.length} weight entries and {pending.customWorkouts.length} custom workouts{pending.profile ? ` for ${pending.profile.name}` : ''}.</p>
            <p className="mt-3">Everything currently on this device will be replaced. Export a backup first if you might want it back.</p>
          </>
        )}
        onConfirm={() => pending && attempt(() => importData(pending), 'Backup imported')} />

      <Confirm open={resetOpen} onClose={() => setResetOpen(false)} danger action="Delete everything" title="Delete all your data?"
        body="Your profile, workout history, weight entries and custom workouts will be permanently removed from this device. This can’t be undone."
        onConfirm={async () => { if (await attempt(() => resetAll().then(() => true))) { clearPrefs(); nav('/welcome', { replace: true }) } }} />
    </div>
  )
}
