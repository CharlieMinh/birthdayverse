import { useDirector, useDirectorState } from '../engine/DirectorContext'

/** Thin chapter indicator along the bottom edge. */
export function ProgressDots() {
  const { order } = useDirector()
  const { sceneIndex, status } = useDirectorState()
  if (status === 'idle') return null
  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center gap-1.5 p-4" aria-hidden="true">
      {order.map((id, i) => {
        const done = i < sceneIndex || status === 'ended'
        const current = i === sceneIndex && !done
        return (
          <span
            key={id}
            className={`h-[3px] rounded-full transition-all duration-700 ${
              done ? 'w-6 bg-accent/70' : current ? 'w-10 bg-accent' : 'w-6 bg-ink/15'
            }`}
          />
        )
      })}
    </div>
  )
}
