/** `{name}` is replaced with the user's first name. Kept plain on purpose. */
export const MESSAGES = [
  '{name}, you’ve got this.',
  'Remember how far you’ve come, {name}. Keep going.',
  'Small steps every day add up to big changes.',
  'You don’t have to be perfect. You just have to keep showing up.',
  'Your future self will thank you for today.',
  'Ten minutes still counts, {name}.',
  'Go at your own pace. It’s your pace that matters.',
  'Strength is built quietly, one session at a time.',
  'Some days are for pushing, some are for moving gently. Both count.',
  'You started this for a reason, {name}. It’s still a good one.',
  'Progress hides in the ordinary days. Today might be one of them.',
  'Be proud of the effort, not just the outcome.',
  'Slow is fine. Steady is better than fast.',
  'Showing up on the hard days is how habits are made.',
  '{name}, look after the body that looks after you.',
]

export const MILESTONES: Record<number, string> = {
  3: 'Three workout days in a row. That’s the start of a habit.',
  7: 'Seven days. A full week of keeping your word to yourself.',
  14: 'Two weeks in. This is starting to feel like part of you.',
  30: 'Thirty days. You’ve turned an intention into a routine.',
  60: 'Sixty days. Consistency like this changes things.',
  100: 'One hundred workout days. Take a moment to be proud of that.',
}

/** Pick a message index that differs from the last one shown. */
export function pickMessage(last: number | undefined, rand = Math.random): number {
  let i = Math.floor(rand() * MESSAGES.length)
  if (i === last) i = (i + 1) % MESSAGES.length
  return i
}

export const fillName = (msg: string, name: string) => msg.replaceAll('{name}', name.split(' ')[0])

/** Shown alongside error messages. The error says what to do; this just keeps the tone kind. */
export const SETBACK_LINES = [
  'A small bump, not a stop sign.',
  'Setbacks are part of every journey.',
  'Deep breath. You’ve handled harder things than this.',
  'Progress isn’t a straight line, and that’s fine.',
  'Your effort still counts.',
  'Pause, reset, carry on.',
]
export const setbackLine = () => SETBACK_LINES[Math.floor(Math.random() * SETBACK_LINES.length)]
