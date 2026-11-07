import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, Dumbbell, Home, Sprout, UserRound } from 'lucide-react'
import { StreakCelebration } from './StreakCelebration'

const NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/workouts', label: 'Workouts', icon: Dumbbell },
  { to: '/history', label: 'History', icon: CalendarDays },
  { to: '/progress', label: 'Progress', icon: Sprout },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

export function Wordmark({ className = '', light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-2xl font-semibold tracking-tight ${light ? 'text-on-forest' : 'text-ink'} ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <circle cx="16" cy="12" r="5" fill="var(--color-apricot)" />
        <path d="M4 22c4-2.5 8-2.5 12 0s8 2.5 12 0" fill="none" stroke={light ? 'var(--color-sage)' : 'var(--color-forest)'} strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      Groundwork
    </span>
  )
}

const spring = { type: 'spring', stiffness: 420, damping: 34 } as const

export function Layout() {
  const location = useLocation()
  const outlet = useOutlet()
  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-on-forest">
        Skip to content
      </a>

      {/* Desktop: a dark floating panel, the same object as the mobile bar */}
      <aside className="sticky top-0 hidden h-dvh p-4 lg:block">
        <div className="flex h-full flex-col rounded-[2rem] bg-night px-4 py-7 text-on-forest shadow-float">
          <Link to="/" aria-label="Groundwork home" className="px-3"><Wordmark light /></Link>
          <nav aria-label="Main" className="mt-10 flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={`relative flex min-h-12 items-center gap-3 rounded-2xl px-4 font-medium transition-colors ${isActive(to) ? 'text-night' : 'text-on-forest/65 hover:text-on-forest'}`}>
                {isActive(to) && <motion.span layoutId="side-pill" transition={spring} className="absolute inset-0 rounded-2xl bg-pill" aria-hidden />}
                <Icon size={19} strokeWidth={2} aria-hidden className="relative" />
                <span className="relative">{label}</span>
              </NavLink>
            ))}
          </nav>
          <p className="mt-auto rounded-2xl bg-on-forest/8 px-4 py-3 text-sm text-on-forest/70">
            Your journal lives on this device. <Link to="/profile#data" className="font-semibold text-on-forest underline decoration-on-forest/40 underline-offset-4">Back it up</Link>
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <main id="main" className="mx-auto max-w-6xl px-4 pt-5 pb-36 sm:px-8 lg:px-10 lg:pt-8 lg:pb-16">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}>
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <StreakCelebration />

      {/* Mobile: dark rounded bar with a white circle behind the active icon */}
      <nav aria-label="Main" className="fixed inset-x-4 z-40 lg:hidden" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <ul className="mx-auto grid h-[4.5rem] max-w-md grid-cols-5 items-center rounded-[2rem] bg-night px-2 shadow-float">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to} className="grid place-items-center">
              <NavLink to={to} end={to === '/'} aria-label={label} title={label}
                className={`relative grid size-14 place-items-center rounded-full transition-colors ${isActive(to) ? 'text-night' : 'text-on-forest/55 hover:text-on-forest'}`}>
                {isActive(to) && <motion.span layoutId="tab-pill" transition={spring} className="absolute inset-0 rounded-full bg-pill" aria-hidden />}
                <motion.span whileTap={{ scale: 0.86 }} className="relative"><Icon size={22} strokeWidth={isActive(to) ? 2.3 : 1.9} aria-hidden /></motion.span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
