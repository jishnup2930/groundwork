import { describe, expect, it } from 'vitest'
import { describeError } from './ui'
import { SETBACK_LINES, setbackLine } from '../data/messages'

describe('error messages', () => {
  it('explains a full device', () => {
    expect(describeError({ name: 'QuotaExceededError' })).toMatch(/out of storage space/)
    expect(describeError({ name: 'AbortError', inner: { name: 'QuotaExceededError' } })).toMatch(/out of storage space/)
  })
  it('explains blocked storage', () => {
    expect(describeError({ name: 'MissingAPIError' })).toMatch(/blocking local storage/)
  })
  it('reassures on anything else, including non-errors', () => {
    expect(describeError(new Error('boom'))).toMatch(/earlier entries are safe/)
    expect(describeError(undefined)).toMatch(/earlier entries are safe/)
  })
  it('always pairs an encouraging line', () => {
    expect(SETBACK_LINES).toContain(setbackLine())
  })
})

import type { KeyboardEvent } from 'react'
import { radioKeys, rovingTab } from './ui'

describe('radio group keyboard support', () => {
  const setup = () => {
    document.body.innerHTML = '<div id="g"><button role="radio">A</button><button role="radio" disabled>B</button><button role="radio">C</button></div>'
    const g = document.getElementById('g')!
    const radios = [...g.querySelectorAll('button')]
    const clicked: string[] = []
    radios.forEach((r) => r.addEventListener('click', () => clicked.push(r.textContent!)))
    const press = (key: string) => {
      let prevented = false
      radioKeys({ key, currentTarget: g, preventDefault: () => (prevented = true) } as unknown as KeyboardEvent<HTMLElement>)
      return prevented
    }
    return { radios, clicked, press }
  }
  it('arrows move to and select the next enabled option, wrapping around', () => {
    const { radios, clicked, press } = setup()
    radios[0].focus()
    expect(press('ArrowRight')).toBe(true)
    expect(document.activeElement).toBe(radios[2]) // skips the disabled one
    press('ArrowDown')
    expect(document.activeElement).toBe(radios[0])
    press('ArrowLeft')
    expect(clicked).toEqual(['C', 'A', 'C'])
  })
  it('Home and End jump to the ends; other keys are left alone', () => {
    const { radios, press } = setup()
    radios[2].focus()
    press('Home')
    expect(document.activeElement).toBe(radios[0])
    press('End')
    expect(document.activeElement).toBe(radios[2])
    expect(press('a')).toBe(false)
  })
  it('only the selected option (or the first, if none) is tabbable', () => {
    expect([0, 1, 2].map((i) => rovingTab(i === 1, i, true))).toEqual([-1, 0, -1])
    expect([0, 1, 2].map((i) => rovingTab(false, i, false))).toEqual([0, -1, -1])
  })
})
