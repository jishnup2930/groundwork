import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { setbackLine } from '../data/messages'

/** Native <dialog>: focus trapping, Esc to close and the backdrop come for free. */
export function Dialog({ open, onClose, title, children, wide = false }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-3xl bg-linen p-0 text-ink shadow-2xl`}
    >
      {open && (
        <div className="p-6 sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="display text-2xl">{title}</h2>
            <button onClick={onClose} className="-m-2 rounded-full p-2 text-ink-soft hover:bg-sand" aria-label="Close">
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function Confirm({ open, onClose, onConfirm, title, body, action, danger = false }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; action: string; danger?: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="text-ink-soft">{body}</div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className={danger ? 'btn-clay' : 'btn-primary'} onClick={() => { onConfirm(); onClose() }}>{action}</button>
      </div>
    </Dialog>
  )
}

type Toast = { id: number; text: string; tone: 'ok' | 'error'; note?: string }
const subs = new Set<(t: Toast) => void>()
let n = 0
/** Error toasts carry an encouraging line and stay up longer, so there's time to read both. */
export const toast = (text: string, tone: Toast['tone'] = 'ok') =>
  subs.forEach((s) => s({ id: ++n, text, tone, note: tone === 'error' ? setbackLine() : undefined }))

export function Toaster() {
  const [items, set] = useState<Toast[]>([])
  useEffect(() => {
    const on = (t: Toast) => {
      set((x) => [...x, t])
      setTimeout(() => set((x) => x.filter((i) => i.id !== t.id)), t.tone === 'error' ? 8000 : 4000)
    }
    subs.add(on)
    return () => void subs.delete(on)
  }, [])
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8">
      {items.map((t) => (
        <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'}
          className={`rise max-w-md px-5 py-3 text-sm font-semibold shadow-lg ${t.tone === 'error' ? 'rounded-2xl bg-clay text-linen' : 'rounded-full bg-forest text-on-forest'}`}>
          {t.text}
          {t.note && <span className="mt-1 block font-display font-normal opacity-90">{t.note}</span>}
        </div>
      ))}
    </div>
  )
}

/** Run a database write and report failures instead of losing them silently. */
export async function attempt<T>(fn: () => Promise<T>, success?: string): Promise<T | undefined> {
  try {
    const r = await fn()
    if (success) toast(success)
    return r
  } catch (e) {
    console.error(e)
    toast(describeError(e), 'error')
  }
}

/** Turn a storage error into something a person can act on. Nothing already saved is lost when a write fails. */
export function describeError(e: unknown): string {
  const name = (e as { name?: string; inner?: { name?: string } })?.inner?.name ?? (e as { name?: string })?.name
  if (name === 'QuotaExceededError') return 'Your device is out of storage space, so that wasn’t saved. Free up some space, then try again.'
  if (name === 'MissingAPIError' || name === 'OpenFailedError' || name === 'InvalidStateError' || name === 'SecurityError')
    return 'This browser is blocking local storage, so that wasn’t saved. Leave private browsing or allow site data, then reload.'
  return 'That wasn’t saved. Your earlier entries are safe. Try again in a moment.'
}

export function PageHeader({ title, intro, children }: { title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
      <div className="max-w-xl">
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {intro && <p className="mt-3 text-ink-soft">{intro}</p>}
      </div>
      {children}
    </header>
  )
}

export function Empty({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-rule px-6 py-12 text-center">
      <p className="display mx-auto max-w-sm text-2xl">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-sm text-ink-soft">{body}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-rule bg-linen p-1">
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${value === o.value ? 'bg-forest text-on-forest' : 'text-ink-soft hover:text-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
