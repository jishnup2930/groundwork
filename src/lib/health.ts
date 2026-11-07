export const bmi = (kg: number, cm: number) => kg / (cm / 100) ** 2

/** Standard adult (18+) WHO categories. Returns null for under-18s, who need age-specific charts. */
export function bmiCategory(value: number, age: number): string | null {
  if (age < 18) return null
  if (value < 18.5) return 'Underweight'
  if (value < 25) return 'Healthy weight'
  if (value < 30) return 'Overweight'
  return 'Obese'
}

export const KG_PER_LB = 0.45359237
export const kgToLb = (kg: number) => kg / KG_PER_LB
export const lbToKg = (lb: number) => lb * KG_PER_LB

export function cmToFtIn(cm: number) {
  const total = cm / 2.54
  let ft = Math.floor(total / 12)
  let inch = Math.round(total - ft * 12)
  if (inch === 12) { ft++; inch = 0 }
  return { ft, inch }
}
export const ftInToCm = (ft: number, inch: number) => (ft * 12 + inch) * 2.54

export const round1 = (n: number) => Math.round(n * 10) / 10

export const formatWeight = (kg: number, unit: 'kg' | 'lb') =>
  unit === 'kg' ? `${round1(kg)} kg` : `${round1(kgToLb(kg))} lb`

export function formatHeight(cm: number, unit: 'cm' | 'ftin') {
  if (unit === 'cm') return `${Math.round(cm)} cm`
  const { ft, inch } = cmToFtIn(cm)
  return `${ft} ft ${inch} in`
}
