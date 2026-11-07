import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { dailyWalkId, db, setDailyWalkDistance, toggleDailyWalk } from '../lib/db'
import { Scene } from './Scene'
import { attempt, radioKeys, rovingTab } from './ui'
import { useLogWithCelebration } from '../hooks/useLogging'
import type { ISODate } from '../types'

const KM = [1, 2, 3, 4, 5]

/** The walk planned for every day: one tap to tick, optional distance. */
export function DailyWalk({ date, minutes }: { date: ISODate; minutes: number }) {
  const walk = useLiveQuery(() => db.sessions.get(dailyWalkId(date)).then((s) => s ?? null), [date])
  const log = useLogWithCelebration()
  if (walk === undefined) return null
  const done = !!walk

  return (
    <section aria-labelledby="walk-title" className="card p-5">
      <div className="flex items-center gap-4">
        <Scene slot="hero" className="size-16 shrink-0 rounded-2xl" figureClass="left-1/2 -translate-x-1/2 w-auto bottom-[6%] h-[84%]" />
        <div className="min-w-0 flex-1">
          <span className="chip bg-mint text-forest">Every day</span>
          <h2 id="walk-title" className="mt-1 text-xl font-semibold">Daily walk</h2>
          <p className="text-sm text-ink-soft">{done ? `Done${walk.distanceKm ? `, ${walk.distanceKm} km` : ''}. Fresh air counts.` : `${minutes} minutes at an easy pace.`}</p>
        </div>
        <motion.button whileTap={{ scale: 0.92 }} aria-pressed={done} aria-label={done ? 'Daily walk done. Tap to untick' : 'Tick off daily walk'}
          onClick={() => attempt(() => log(() => toggleDailyWalk(date, minutes)))}
          className={`grid size-14 shrink-0 place-items-center rounded-full border-2 transition-colors ${done ? 'border-forest bg-forest text-on-forest' : 'border-rule text-ink-soft hover:border-forest'}`}>
          <motion.span animate={{ scale: done ? [1, 1.25, 1] : 1 }} transition={{ duration: 0.3 }}><Check size={26} strokeWidth={3} /></motion.span>
        </motion.button>
      </div>
      {done && (
        <div className="mt-4" role="radiogroup" aria-label="How far did you walk? (optional)" onKeyDown={radioKeys}>
          <p className="mb-2 text-sm font-semibold text-ink-soft">How far? <span className="font-normal">(optional)</span></p>
          <div className="flex flex-wrap gap-2">
            {KM.map((k, i) => (
              <button key={k} role="radio" aria-checked={walk.distanceKm === k} tabIndex={rovingTab(walk.distanceKm === k, i, !!walk.distanceKm && KM.includes(walk.distanceKm))}
                onClick={() => attempt(() => setDailyWalkDistance(date, k))}
                className={`chip min-h-9 px-4 text-sm ${walk.distanceKm === k ? 'bg-forest text-on-forest' : 'bg-paper text-ink'}`}>{k} km</button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
