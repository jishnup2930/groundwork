import { beforeEach, describe, expect, it } from 'vitest'
import { clearPrefs, getPrefs, setPrefs } from './prefs'

const load = (saved: object | null) => {
  clearPrefs() // also resets the in-memory cache
  if (saved) localStorage.setItem('gw.prefs', JSON.stringify(saved))
  return getPrefs()
}

describe('theme preference', () => {
  beforeEach(() => localStorage.clear())
  it('starts in light for new users', () => expect(load(null).theme).toBe('light'))
  it('moves an old automatic "system" default to light', () => expect(load({ theme: 'system', weightUnit: 'lb' })).toMatchObject({ theme: 'light', weightUnit: 'lb' }))
  it('keeps a deliberate choice made after the change', () => expect(load({ theme: 'system', v: 2 }).theme).toBe('system'))
  it('keeps an old explicit dark choice', () => expect(load({ theme: 'dark' }).theme).toBe('dark'))
  it('saves new choices with the current format', () => {
    load(null)
    setPrefs({ theme: 'system' })
    expect(JSON.parse(localStorage.getItem('gw.prefs')!)).toMatchObject({ theme: 'system', v: 2 })
  })
})
