/** Growth rings: one ring per workout day in the current streak, like a tree adding a year. */
export function Rings({ count, size = 168 }: { count: number; size?: number }) {
  const shown = Math.min(count, 24)
  const max = 46
  const step = shown ? (max - 7) / Math.max(shown, 6) : 0
  const ring = (r: number, seed: number) => {
    const pts = Array.from({ length: 73 }, (_, i) => {
      const t = (i / 72) * Math.PI * 2
      const rr = r + Math.sin(t * 3 + seed) * 0.9 + Math.sin(t * 5 + seed * 2.3) * 0.5
      return `${(50 + rr * Math.cos(t)).toFixed(2)},${(50 + rr * Math.sin(t)).toFixed(2)}`
    })
    return `M${pts.join('L')}Z`
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${count} day streak`}>
      <circle cx="50" cy="50" r={max + 2} fill="var(--color-sand)" opacity="0.35" />
      {shown === 0 && <circle cx="50" cy="50" r="20" fill="none" stroke="var(--color-rule)" strokeWidth="1.2" strokeDasharray="2 3" />}
      {Array.from({ length: shown }, (_, i) => (
        <path key={i} d={ring(7 + step * (i + 1), i * 1.7)} fill="none"
          stroke={i === shown - 1 ? 'var(--color-clay)' : 'var(--color-moss)'}
          strokeWidth={i === shown - 1 ? 2.2 : 1.3} opacity={i === shown - 1 ? 1 : 0.35 + (0.5 * i) / Math.max(shown, 1)} />
      ))}
      <circle cx="50" cy="50" r="4.5" fill={count ? 'var(--color-clay)' : 'var(--color-rule)'} />
    </svg>
  )
}
