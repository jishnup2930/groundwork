import { Figure } from './Figure'
import { Leaves } from './Leaves'
import type { Exercise } from '../types'

/** Animated demonstration plus plain steps, so a beginner can see how a move is done. */
export function ExerciseDemo({ exercise: e, showName = false }: { exercise: Exercise; showName?: boolean }) {
  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-start">
      <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-mint via-linen to-sand">
        <Leaves set="sprig" className="absolute -bottom-2 -left-3 w-20 opacity-70" />
        <Figure move={e.pose} animate tone="scene" floor title={`Animated demonstration of ${e.name}`} className="relative w-full p-3" />
      </div>
      <div>
        {showName && <h3 className="text-xl font-semibold">{e.name}</h3>}
        <div className="flex flex-wrap gap-1.5">
          <span className="chip bg-mint text-forest">{e.sets} {e.sets === 1 ? 'set' : 'sets'} of {e.duration ? `${e.duration} sec` : `${e.reps} reps`}</span>
          <span className="chip bg-paper text-ink">Rest {e.restDuration} sec</span>
          <span className="chip bg-paper text-ink">{e.muscleGroup}</span>
        </div>
        {e.description && <p className="mt-3 text-ink-soft">{e.description}</p>}
        {e.instructions.length > 0 && (
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-forest">
            {e.instructions.map((s) => <li key={s}>{s}</li>)}
          </ol>
        )}
        {e.modification && <p className="mt-3 rounded-2xl bg-paper px-4 py-3 text-sm"><span className="font-semibold">Make it easier: </span>{e.modification}</p>}
        <p className="mt-3 text-xs text-ink-soft">Move slowly and stop if anything hurts or you feel dizzy.</p>
      </div>
    </div>
  )
}
