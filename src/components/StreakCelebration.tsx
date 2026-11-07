import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'motion/react'
import { Flame } from 'lucide-react'
import { useHistory } from '../hooks/useData'
import { currentStreak } from '../lib/streak'
import { getPrefs, setPrefs } from '../lib/prefs'
import { today } from '../lib/dates'
import { MILESTONES } from '../data/messages'

type Moment = { from: number; to: number; reason: 'open' | 'logged' }
const subs = new Set<(m: Moment) => void>()

/** Show the streak celebration after logging made the streak grow, unless today already celebrated this high. */
export function celebrate(from: number, to: number) {
  const p = getPrefs()
  if (p.lastCelebrated === today() && (p.celebratedTo ?? 0) >= to) return
  setPrefs({ lastCelebrated: today(), celebratedTo: to })
  subs.forEach((s) => s({ from, to, reason: 'logged' }))
}

/** Mounted once. Plays on the first open of each day, and whenever celebrate() is called. */
export function StreakCelebration() {
  const h = useHistory()
  const [m, setM] = useState<Moment | null>(null)
  const [n, setN] = useState(0)
  const checked = useRef(false)

  useEffect(() => {
    subs.add(setM)
    return () => void subs.delete(setM)
  }, [])

  // First open today: celebrate the streak you're carrying, once.
  useEffect(() => {
    if (!h || checked.current) return
    checked.current = true
    if (getPrefs().lastCelebrated === h.today) return
    const s = currentStreak(h)
    setPrefs({ lastCelebrated: h.today, celebratedTo: s })
    if (s > 0) setM({ from: Math.max(0, s - 1), to: s, reason: 'open' })
  }, [h])

  useEffect(() => {
    if (!m) return
    // motion's imperative animate() isn't covered by MotionConfig, so honour reduced motion here
    const start = matchMedia('(prefers-reduced-motion: reduce)').matches ? m.to : m.from
    setN(start)
    const counting = animate(start, m.to, { duration: 0.9, delay: 0.45, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) })
    const close = setTimeout(() => setM(null), 4000)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setM(null)
    addEventListener('keydown', onKey)
    return () => { counting.stop(); clearTimeout(close); removeEventListener('keydown', onKey) }
  }, [m])

  const milestone = m && MILESTONES[m.to]
  return (
    <>
    <div role="status" aria-live="polite" className="sr-only">{m ? `${m.to} day streak. ${milestone ?? ''}` : ''}</div>
    <AnimatePresence>
      {m && (
        <motion.div key="streak" onClick={() => setM(null)}
          className="fixed inset-0 z-[60] grid cursor-pointer place-items-center bg-paper/85 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <motion.div className="relative grid place-items-center text-center" initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}>
            <div className="relative grid size-44 place-items-center">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} aria-hidden className="absolute inset-0 rounded-full border-2 border-apricot"
                  initial={{ scale: 0.5, opacity: 0.7 }} animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.6, delay: 0.3 + i * 0.35, repeat: 1, ease: 'easeOut' }} />
              ))}
              <motion.span aria-hidden className="grid size-28 place-items-center rounded-full bg-apricot/20"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}>
                <motion.span animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 0.8, delay: 0.5 }}>
                  <Flame size={64} className="text-apricot" fill="currentColor" />
                </motion.span>
              </motion.span>
            </div>
            <p aria-hidden className="num mt-2 font-display text-7xl font-semibold tracking-tight">{n}</p>
            <p aria-hidden className="text-xl font-semibold">day streak</p>
            <p aria-hidden className="mt-2 max-w-xs text-ink-soft">
              {milestone ?? (m.reason === 'logged' ? 'Another day added. Nicely done.' : 'Welcome back. Keep it going today.')}
            </p>
            <button autoFocus className="btn-primary mt-6 px-8" onClick={() => setM(null)}>Continue</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
