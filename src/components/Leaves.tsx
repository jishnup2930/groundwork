/** Botanical decoration: a few hand-placed leaves. Purely decorative. */
const LEAF = 'M0 0C14-22 46-26 70-8 46 12 16 14 0 0Z'
const VEIN = 'M2 0C22-4 42-7 64-8'

interface Leaf { x: number; y: number; r: number; s: number; tone: 'sage' | 'moss' | 'forest' }

const SETS: Record<'corner' | 'edge' | 'sprig', Leaf[]> = {
  corner: [
    { x: 0, y: 70, r: -70, s: 1.6, tone: 'forest' },
    { x: 10, y: 60, r: -40, s: 1.3, tone: 'moss' },
    { x: 0, y: 40, r: -15, s: 1.1, tone: 'sage' },
    { x: 30, y: 85, r: -95, s: 1.2, tone: 'sage' },
  ],
  edge: [
    { x: 160, y: 10, r: 130, s: 1.5, tone: 'moss' },
    { x: 165, y: 40, r: 160, s: 1.2, tone: 'sage' },
    { x: 150, y: 70, r: 110, s: 1.4, tone: 'forest' },
  ],
  sprig: [
    { x: 40, y: 90, r: -60, s: 0.9, tone: 'moss' },
    { x: 40, y: 90, r: -110, s: 0.8, tone: 'sage' },
    { x: 40, y: 90, r: -85, s: 1.1, tone: 'forest' },
  ],
}

export function Leaves({ set = 'corner', className = '' }: { set?: keyof typeof SETS; className?: string }) {
  return (
    <svg viewBox="0 0 180 100" className={`pointer-events-none ${className}`} aria-hidden>
      {SETS[set].map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(${l.s})`}>
          <path d={LEAF} fill={`var(--color-${l.tone})`} opacity={l.tone === 'sage' ? 0.9 : 0.85} />
          <path d={VEIN} fill="none" stroke="var(--color-linen)" strokeOpacity="0.45" strokeWidth="1" />
        </g>
      ))}
    </svg>
  )
}
