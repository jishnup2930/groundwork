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
