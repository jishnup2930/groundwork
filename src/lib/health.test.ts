import { describe, expect, it } from 'vitest'
import { bmi, bmiCategory, cmToFtIn, ftInToCm, kgToLb, lbToKg } from './health'

describe('BMI', () => {
  it('calculates weight / height²', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.86, 2)
    expect(bmi(90, 180)).toBeCloseTo(27.78, 2)
  })
  it('uses adult categories at the boundaries', () => {
    expect(bmiCategory(18.4, 30)).toBe('Underweight')
    expect(bmiCategory(18.5, 30)).toBe('Healthy weight')
    expect(bmiCategory(24.9, 30)).toBe('Healthy weight')
    expect(bmiCategory(25, 30)).toBe('Overweight')
    expect(bmiCategory(30, 30)).toBe('Obese')
  })
  it('does not apply adult categories under 18', () => {
    expect(bmiCategory(22, 17)).toBeNull()
  })
  it('converts units both ways', () => {
    expect(lbToKg(kgToLb(80))).toBeCloseTo(80)
    expect(cmToFtIn(180)).toEqual({ ft: 5, inch: 11 })
    expect(cmToFtIn(182.8)).toEqual({ ft: 6, inch: 0 })
    expect(ftInToCm(5, 11)).toBeCloseTo(180.34)
  })
})
