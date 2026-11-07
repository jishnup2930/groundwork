import { motion } from 'motion/react'
import { Check, Leaf } from 'lucide-react'
import type { DayStatus } from '../lib/streak'
import { fromISO } from '../lib/dates'

const LABEL: Record<DayStatus, string> = {
  done: 'workout done', rest: 'rest day', missed: 'no workout', today: 'today, still to do', upcoming: 'coming up', none: 'before you started',
}

const PILL: Record<DayStatus, string> = {
  done: 'bg-forest text-on-forest',
  today: 'bg-apricot text-night',
  rest: 'bg-sand text-moss',
  missed: 'border-2 border-dashed border-rule text-ink-soft',
  upcoming: 'bg-track text-ink-soft [background-image:repeating-linear-gradient(135deg,transparent_0_6px,rgb(0_0_0/0.035)_6px_8px)]',
  none: 'bg-track/60 text-ink-soft/60',
}

export function WeekStrip({ days, today }: { days: { date: string; status: DayStatus }[]; today: string }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="This week">
      {days.map(({ date, status }, i) => {
        const d = fromISO(date)
        const s = date === today && status !== 'done' ? 'today' : status
        return (
          <li key={date} className="flex flex-col items-center gap-2" aria-label={`${d.toLocaleDateString('en-GB', { weekday: 'long' })}: ${LABEL[s]}`}>
            <motion.span aria-hidden
              initial={{ scaleY: 0.4, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
              className={`grid h-16 w-full max-w-11 origin-bottom place-items-center rounded-full ${PILL[s]}`}>
              {status === 'done' ? <Check size={18} strokeWidth={2.75} />
                : status === 'rest' ? <Leaf size={16} />
                : <span className="num text-sm font-semibold">{d.getDate()}</span>}
            </motion.span>
            <span className={`text-xs font-semibold ${date === today ? 'text-ink' : 'text-ink-soft'}`} aria-hidden>
              {d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
