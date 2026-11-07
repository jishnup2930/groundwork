import { useEffect, useState } from 'react'

/**
 * Point order: head, neck, mid-back, hip, near elbow, near hand, far elbow, far hand,
 * near knee, near foot, far knee, far foot. Side views face right; viewBox is 120×100, floor at y=91.
 */
type Pose = number[]
interface Move { a: Pose; b: Pose; prop?: 'wall' | 'bench' }

const STAND: Pose = [60,16, 60,25, 60,39, 60,53, 61,38, 62,51, 59,38, 58,51, 61,72, 60,91, 59,72, 59,91]
const FRONT: Pose = [60,16, 60,25, 60,39, 60,53, 53,37, 50,50, 67,37, 70,50, 56,72, 55,91, 64,72, 65,91]
const HIPS: Pose = [60,16, 60,25, 60,39, 60,53, 53,37, 59,50, 54,38, 60,51, 61,72, 60,91, 59,72, 59,91]
const FOURS: Pose = [83,59, 75,64, 61,67, 47,70, 75,77.5, 75,91, 73,77.5, 73,91, 47,89, 28,91, 49,89, 30,91]
const LYING: Pose = [22,84, 31,86, 45,87, 59,87, 44,89, 57,90, 46,89, 59,90, 73,73, 80,91, 75,73, 82,91]
const KNEEL: Pose = [88.5,61, 80,64, 66,68.5, 52,73, 80,77.5, 80,91, 78,77.5, 78,91, 43,90, 25,90, 45,90, 27,90]

const with_ = (base: Pose, changes: Record<number, [number, number]>): Pose => {
  const p = [...base]
  for (const [i, [x, y]] of Object.entries(changes)) { p[+i * 2] = x; p[+i * 2 + 1] = y }
  return p
}
const shift = (base: Pose, dy: number, keep: number[] = []) => base.map((v, i) => (i % 2 && !keep.includes(i >> 1) ? v + dy : v))

export const MOVES: Record<string, Move> = {
  squat: { a: STAND, b: [64.5,29.6, 61,38, 55.5,51, 50,64, 74,39, 87,38, 73,41, 86,41, 66,70, 62,91, 64,71, 60,91] },
  wallPush: {
    prop: 'wall',
    a: [71.3,23.6, 68,32, 63,44.5, 58,57, 80.5,35, 93,38, 79.5,36, 92,39, 51.6,74, 45,91, 50.6,74, 44,91],
    b: [82.6,28.3, 78,36, 71,47.6, 64,59.3, 84,46, 93,38, 83,47, 92,39, 54.5,75, 45,91, 53.5,75, 44,91],
  },
  bridge: { a: LYING, b: with_(LYING, { 2: [45,79], 3: [58,72], 8: [74,70], 9: [80,91], 10: [76,70], 11: [82,91] }) },
  kneeRaise: { a: HIPS, b: with_(HIPS, { 8: [78,55], 9: [77,74] }) },
  birdDog: { a: FOURS, b: with_(FOURS, { 4: [88,62], 5: [101,60], 10: [29,69], 11: [10,68] }) },
  lunge: { a: STAND, b: [59.5,27, 59,36, 58.5,50, 58,64, 60,49, 61,62, 58,49, 57,62, 75,73, 75,91, 49,83, 32,90] },
  calfRaise: { a: STAND, b: shift(STAND, -4) },
  sideLeg: { a: FRONT, b: with_(FRONT, { 0: [57,16], 1: [58,25], 10: [76,66], 11: [90,78] }) },
  inclinePush: {
    prop: 'bench',
    a: [86.7,40, 80,46, 69.4,55.5, 58.8,65, 84,58, 88,70, 83,59, 87,70, 44.4,78, 30,91, 43.4,78, 29,91],
    b: [91.7,53.3, 84,58, 72.5,65, 61.1,72, 77,68, 88,70, 76,69, 87,70, 45.6,81.5, 30,91, 44.6,81.5, 29,91],
  },
  armCircles: {
    a: with_(FRONT, { 4: [47,25], 5: [34,25], 6: [73,25], 7: [86,25] }),
    b: with_(FRONT, { 4: [47,21], 5: [35,14], 6: [73,21], 7: [85,14] }),
  },
  shoulderTap: { a: KNEEL, b: with_(KNEEL, { 4: [90,71], 5: [82,66] }) },
  catCow: { a: with_(FOURS, { 0: [82,70], 2: [61,57] }), b: with_(FOURS, { 0: [85,56], 2: [61,72] }) },
  childsPose: {
    a: [80,86, 73,84, 60,77, 46,82, 86,90, 99,90, 85,89, 98,89, 62,90, 44,91, 60,90, 42,91],
    b: [80,86, 73,84, 60,75, 46,82, 86,90, 99,90, 85,89, 98,89, 62,90, 44,91, 60,90, 42,91],
  },
  sideStretch: {
    a: with_(FRONT, { 4: [52,37], 5: [57,49], 6: [62,12], 7: [63,1] }),
    b: with_(FRONT, { 0: [52,18], 1: [55,26], 2: [58,39], 4: [47,37], 5: [53,49], 6: [61,13], 7: [52,4] }),
  },
  hipCircles: {
    a: with_(FRONT, { 3: [55,53], 4: [50,38], 5: [55,51], 6: [70,38], 7: [65,51], 8: [54,72], 10: [61,72] }),
    b: with_(FRONT, { 3: [65,53], 4: [50,38], 5: [65,51], 6: [70,38], 7: [65,51], 8: [59,72], 10: [66,72] }),
  },
  shoulderRolls: { a: FRONT, b: with_(FRONT, { 1: [60,22], 4: [53,34], 5: [51,47], 6: [67,34], 7: [69,47] }) },
  deadBug: {
    a: with_(LYING, { 4: [32,73], 5: [33,60], 6: [34,73], 7: [35,60], 8: [63,68], 9: [80,68], 10: [65,68], 11: [82,68] }),
    b: with_(LYING, { 4: [20,78], 5: [9,82], 6: [34,73], 7: [35,60], 8: [63,68], 9: [80,68], 10: [77,80], 11: [95,85] }),
  },
  plank: {
    a: [88.5,74, 80,77, 66.5,77.5, 53,78, 80,90, 93,90, 78,90, 91,90, 43,90, 25,88, 45,90, 27,88],
    b: [88.5,74, 80,77, 66.5,76, 53,78, 80,90, 93,90, 78,90, 91,90, 43,90, 25,88, 45,90, 27,88],
  },
  march: {
    a: with_(STAND, { 4: [65,37], 5: [73,45], 6: [55,37], 7: [50,48], 10: [76,56], 11: [75,75] }),
    b: with_(STAND, { 4: [55,37], 5: [50,48], 6: [65,37], 7: [73,45], 8: [78,55], 9: [77,74] }),
  },
  stand: { a: FRONT, b: with_(FRONT, { 1: [60,24] }) },
  stepJack: { a: FRONT, b: with_(FRONT, { 4: [52,15], 5: [45,4], 6: [68,15], 7: [75,4], 10: [68,72], 11: [74,91] }) },
}

const pts = (p: Pose, idx: number[]) => idx.map((i) => `${p[i * 2]},${p[i * 2 + 1]}`).join(' ')
const LIMBS = { torso: [1, 2, 3], nearArm: [1, 4, 5], farArm: [1, 6, 7], nearLeg: [3, 8, 9], farLeg: [3, 10, 11] }

function useReducedMotion() {
  const [reduced, set] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => set(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return reduced
}

interface Props {
  move?: string
  animate?: boolean
  className?: string
  title?: string
  /** colour of the figure's lines; defaults to the ink token */
  tone?: 'ink' | 'paper'
}

export function Figure({ move = 'stand', animate = false, className = '', title, tone = 'ink' }: Props) {
  const reduced = useReducedMotion()
  const m = MOVES[move] ?? MOVES.stand
  const anim = animate && !reduced
  const pose = anim ? m.a : m.b // when still, show the "doing it" position
  const line = tone === 'paper' ? 'var(--color-on-forest)' : 'var(--color-ink)'
  const spline = { dur: '2.6s', repeatCount: 'indefinite', calcMode: 'spline', keyTimes: '0;0.5;1', keySplines: '.45 0 .55 1;.45 0 .55 1' }

  const limb = (key: keyof typeof LIMBS, far = false) => (
    <polyline key={key} points={pts(pose, LIMBS[key])} opacity={far ? 0.38 : 1}>
      {anim && <animate attributeName="points" values={`${pts(m.a, LIMBS[key])};${pts(m.b, LIMBS[key])};${pts(m.a, LIMBS[key])}`} {...spline} />}
    </polyline>
  )

  return (
    <svg viewBox="0 0 120 100" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <line x1="4" y1="93.5" x2="116" y2="93.5" stroke="var(--color-rule)" strokeWidth="1.5" strokeLinecap="round" />
      {m.prop === 'wall' && <line x1="96" y1="8" x2="96" y2="93" stroke="var(--color-rule)" strokeWidth="3" strokeLinecap="round" />}
      {m.prop === 'bench' && <rect x="84" y="71" width="24" height="22" rx="2" fill="var(--color-sand)" />}
      <g fill="none" stroke={line} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        {limb('farArm', true)}
        {limb('farLeg', true)}
        {limb('torso')}
        {limb('nearLeg')}
        {limb('nearArm')}
      </g>
      <circle cx={pose[0]} cy={pose[1]} r="6.5" fill="var(--color-clay)">
        {anim && (
          <>
            <animate attributeName="cx" values={`${m.a[0]};${m.b[0]};${m.a[0]}`} {...spline} />
            <animate attributeName="cy" values={`${m.a[1]};${m.b[1]};${m.a[1]}`} {...spline} />
          </>
        )}
      </circle>
    </svg>
  )
}
