import { NavLink, Outlet, Link } from 'react-router-dom'
import { Home, Dumbbell, CalendarDays, Sprout, UserRound, Play } from 'lucide-react'
import { useActive } from '../hooks/useData'

const NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/workouts', label: 'Workouts', icon: Dumbbell },
  { to: '/history', label: 'History', icon: CalendarDays },
  { to: '/progress', label: 'Progress', icon: Sprout },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`display inline-flex items-center gap-2 text-2xl ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <circle cx="16" cy="12" r="5" fill="var(--color-clay)" />
        <path d="M4 22c4-2.5 8-2.5 12 0s8 2.5 12 0" fill="none" stroke="var(--color-forest)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      Groundwork
    </span>
  )
}

export function Layout() {
  const active = useActive()
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-on-forest">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rule px-6 py-8 lg:flex">
        <Link to="/" aria-label="Groundwork home"><Wordmark /></Link>
        <nav aria-label="Main" className="mt-12 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-full px-4 font-semibold transition-colors ${isActive ? 'bg-forest text-on-forest' : 'text-ink-soft hover:bg-sand/60 hover:text-ink'}`}>
              <Icon size={19} strokeWidth={2} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto text-sm text-ink-soft">
          Your journal lives on this device. <Link to="/profile#data" className="link">Back it up</Link>
        </p>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between px-5 pt-5 lg:hidden">
          <Link to="/" aria-label="Groundwork home"><Wordmark className="text-xl" /></Link>
        </header>
        {active && (
          <Link to="/session" className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-2xl bg-clay px-5 py-3 font-semibold text-linen sm:mx-8 lg:mx-12 lg:mt-8">
            <span>{active.workout.name} is still in progress</span>
            <span className="inline-flex items-center gap-1.5"><Play size={16} fill="currentColor" aria-hidden /> Resume</span>
          </Link>
        )}
        <main id="main" className="mx-auto max-w-5xl px-5 pt-8 pb-32 sm:px-8 lg:px-12 lg:pt-12 lg:pb-16">
          <Outlet />
        </main>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-linen/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} end={to === '/'}
                className={({ isActive }) => `relative flex min-h-16 flex-col items-center justify-center gap-1 text-[0.72rem] font-semibold ${isActive ? 'text-forest dark:text-moss' : 'text-ink-soft'}`}>
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute top-0 h-1 w-8 rounded-b-full bg-clay" aria-hidden />}
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
