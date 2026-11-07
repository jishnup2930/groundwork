import { useSyncExternalStore } from 'react'
import type { AppSettings } from '../types'

const KEY = 'gw.prefs'
export const DEFAULT_PREFS: AppSettings = {
  theme: 'light', // matches the design reference; Auto and Dark are opt-in
  weightUnit: 'kg',
  heightUnit: 'cm',
  reminder: { enabled: false, time: '18:00' },
  v: 2,
}

/** Before v2, 'system' was saved automatically as the default, not chosen. Move those to the new default. */
export function migratePrefs(saved: Partial<AppSettings>): Partial<AppSettings> {
  const out = { ...saved }
  if (out.v !== 2 && out.theme === 'system') out.theme = DEFAULT_PREFS.theme
  return { ...out, v: 2 }
}

let cache: AppSettings | null = null
const listeners = new Set<() => void>()

export function getPrefs(): AppSettings {
  if (cache) return cache
  try {
    cache = { ...DEFAULT_PREFS, ...migratePrefs(JSON.parse(localStorage.getItem(KEY) || '{}')) }
  } catch {
    cache = { ...DEFAULT_PREFS }
  }
  return cache!
}

export function setPrefs(changes: Partial<AppSettings>) {
  cache = { ...getPrefs(), ...changes }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* private mode or full storage: preferences just won't persist */
  }
  applyTheme(cache.theme)
  listeners.forEach((l) => l())
}

export function clearPrefs() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
  cache = null
  applyTheme(DEFAULT_PREFS.theme)
  listeners.forEach((l) => l())
}

export function applyTheme(theme: AppSettings['theme']) {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}

export function usePrefs(): AppSettings {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), getPrefs)
}
