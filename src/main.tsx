import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { describeError, toast } from './components/ui'
import './styles.css'

// Background work (timers, heartbeats) has no screen to report to, so surface failures here.
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason)
  toast(describeError(e.reason), 'error')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
