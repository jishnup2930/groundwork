import { Component, lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { Layout } from './components/Layout'
import { Toaster } from './components/ui'
import { setbackLine } from './data/messages'
import { useProfile } from './hooks/useData'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { Workouts } from './pages/Workouts'
import { WorkoutDetail } from './pages/WorkoutDetail'
import { Builder } from './pages/Builder'
import { History } from './pages/History'
// Recharts is large; only load it when someone opens Progress.
const Progress = lazy(() => import('./pages/Progress').then((m) => ({ default: m.Progress })))
import { Profile } from './pages/Profile'

const STORAGE_ERRORS = ['MissingAPIError', 'OpenFailedError', 'InvalidStateError', 'SecurityError', 'DatabaseClosedError']

/** Last line of defence: if a screen crashes, explain it kindly and offer a way out. Saved data is untouched. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; line: string }> {
  state = { error: null as Error | null, line: '' }
  static getDerivedStateFromError(error: Error) { return { error, line: setbackLine() } }
  componentDidCatch(error: Error) { console.error(error) }
  render() {
    const { error, line } = this.state
    if (!error) return this.props.children
    const e = error as Error & { inner?: Error }
    const storage = STORAGE_ERRORS.includes(e.inner?.name ?? e.name)
    const offline = /Failed to fetch dynamically imported module|Loading chunk/i.test(e.message)
    return (
      <main className="mx-auto grid min-h-dvh max-w-lg content-center px-6 text-center">
        <p className="font-display text-xl text-ink-soft">{line}</p>
        <h1 className="display mt-4 text-4xl">
          {storage ? 'Groundwork can’t open its storage' : offline ? 'This page needs a connection the first time' : 'Something went wrong on this screen'}
        </h1>
        <p className="mt-4 text-ink-soft">
          {storage
            ? 'Your browser is blocking local storage. This often happens in private browsing or when site data is turned off. Open Groundwork in a normal window, or allow site data for this site, then reload.'
            : offline
              ? 'This part of the app hasn’t been saved for offline use yet. Reconnect to the internet and reload. After that it will work offline too.'
              : 'Your workouts and entries are saved on this device and haven’t been affected. Reloading usually fixes this.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className="btn-primary" onClick={() => location.reload()}>Reload</button>
          {!storage && <button className="btn-ghost" onClick={() => location.assign(import.meta.env.BASE_URL)}>Go to home</button>}
        </div>
      </main>
    )
  }
}

function Gate() {
  const profile = useProfile()
  if (profile === undefined) return null // loading: avoid a flash of onboarding
  if (!profile?.onboardingCompleted)
    return (
      <Routes>
        <Route path="/welcome" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    )
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/workouts" element={<Workouts />} />
        <Route path="/workouts/new" element={<Builder />} />
        <Route path="/workouts/:id" element={<WorkoutDetail />} />
        <Route path="/workouts/:id/edit" element={<Builder />} />
        <Route path="/history" element={<History />} />
        <Route path="/progress" element={<Suspense fallback={null}><Progress /></Suspense>} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      {/* Honour the OS "reduce motion" setting for every animation */}
      <MotionConfig reducedMotion="user">
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Gate />
        <Toaster />
      </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  )
}
