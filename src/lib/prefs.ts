import { useSyncExternalStore } from 'react'
import type { AppSettings } from '../types'

const KEY = 'gw.prefs'
export const DEFAULT_PREFS: AppSettings = {
  theme: 'system',
  weightUnit: 'kg',
  heightUnit: 'cm',
  reminder: { enabled: false, time: '18:00' },
}

let cache: AppSettings | null = null
const listeners = new Set<() => void>()

export function getPrefs(): AppSettings {
  if (cache) return cache
  try {
    cache = { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
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
  applyTheme('system')
  listeners.forEach((l) => l())
}

export function applyTheme(theme: AppSettings['theme']) {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}

export function usePrefs(): AppSettings {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), getPrefs)
}
