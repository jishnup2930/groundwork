import { Check } from 'lucide-react'
import type { DayStatus } from '../lib/streak'
import { fromISO } from '../lib/dates'

const LABEL: Record<DayStatus, string> = {
  done: 'workout done', rest: 'rest day', missed: 'no workout', today: 'today, still to do', upcoming: 'coming up', none: 'before you started',
}

export function WeekStrip({ days, today }: { days: { date: string; status: DayStatus }[]; today: string }) {
  return (
    <ol className="grid grid-cols-7 gap-1 sm:gap-2" aria-label="This week">
      {days.map(({ date, status }) => {
        const d = fromISO(date)
        const isToday = date === today
        const name = d.toLocaleDateString('en-GB', { weekday: 'short' })
        return (
          <li key={date} className="flex flex-col items-center gap-2" aria-label={`${d.toLocaleDateString('en-GB', { weekday: 'long' })}: ${LABEL[status]}`}>
            <span className={`text-xs font-semibold sm:text-sm ${isToday ? 'text-clay' : 'text-ink-soft'}`} aria-hidden>
              {name.slice(0, 3)}
            </span>
            <span aria-hidden className={`grid size-9 place-items-center rounded-full sm:size-11 ${
              status === 'done' ? 'bg-forest text-on-forest'
              : status === 'today' ? 'border-2 border-clay text-clay'
              : status === 'upcoming' ? 'border border-rule'
              : status === 'missed' ? 'border border-dashed border-rule'
              : ''}`}>
              {status === 'done' ? <Check size={18} strokeWidth={2.5} />
                : status === 'rest' ? <span className="h-0.5 w-4 rounded bg-rule" />
                : <span className="num text-sm text-ink-soft">{d.getDate()}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
