import { motion } from 'motion/react'
import { SCENES, type SceneSlot } from '../data/scenes'
import { Figure } from './Figure'
import { Leaves } from './Leaves'

const BLOB = 'M200 70c78-6 140 52 136 128-4 80-62 136-140 132S62 270 66 196C70 122 126 76 200 70Z'
const float = { animate: { y: [0, -6, 0] }, transition: { duration: 7, repeat: Infinity, ease: 'easeInOut' as const } }
const sway = (delay = 0) => ({ animate: { rotate: [0, 3, 0] }, transition: { duration: 6, delay, repeat: Infinity, ease: 'easeInOut' as const } })

/**
 * An illustrated scene: soft sun, an organic blob, a hill, swaying leaves and an animated figure.
 * Pure SVG/CSS, so it works offline and follows the theme colours.
 */
export function Scene({ slot, className = '', figureClass = 'left-1/2 -translate-x-1/2 w-auto bottom-[6%] h-[80%]', decorative = true }: {
  slot: SceneSlot; className?: string
  /** where the figure sits, so overlaid content doesn't hide it */
  figureClass?: string
  decorative?: boolean
}) {
  const s = SCENES[slot]
  // Callers often position the scene absolutely; only add `relative` when they don't, or it would override theirs.
  const pos = /\b(absolute|fixed)\b/.test(className) ? '' : 'relative'
  return (
    <div className={`${pos} overflow-hidden bg-gradient-to-b from-linen via-paper to-sand/60 ${className}`}
      role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : s.label} aria-hidden={decorative || undefined}>
      <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full">
        <circle cx="312" cy="96" r="44" fill="var(--color-apricot)" opacity="0.28" />
        <motion.path d={BLOB} fill={`var(--color-${s.blob})`} opacity={s.blob === 'apricot' ? 0.3 : 0.55} {...float} />
        <path d="M0 330C80 300 170 306 250 322s110 14 150 4V400H0Z" fill="var(--color-sand)" opacity="0.7" />
      </svg>
      <motion.div className="absolute -bottom-3 -left-5 w-2/5 max-w-56 origin-bottom-left" {...sway()}><Leaves set="corner" className="w-full" /></motion.div>
      <motion.div className="absolute -right-6 -top-1 w-1/3 max-w-44 origin-top-right" {...sway(1.5)}><Leaves set="edge" className="w-full" /></motion.div>
      <Figure move={s.move} animate tone="scene" className={`absolute max-w-none ${figureClass}`} />
    </div>
  )
}
