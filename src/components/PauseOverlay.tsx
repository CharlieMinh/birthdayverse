import { useDirector, useDirectorState } from '../engine/DirectorContext'
import { useUi } from '../config/ConfigContext'
import { PlayIcon } from './Icons'

export function PauseOverlay() {
  const director = useDirector()
  const { status } = useDirectorState()
  const t = useUi()
  if (status !== 'paused') return null

  return (
    <button
      type="button"
      onClick={() => director.resume()}
      className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-bg/60 text-ink backdrop-blur-sm"
      aria-label={t.resume}
    >
      <span className="grid h-20 w-20 place-items-center rounded-full border border-accent/40 bg-surface/60 text-accent shadow-[0_0_60px_rgb(var(--c-accent)/0.35)]">
        <span className="scale-150">
          <PlayIcon />
        </span>
      </span>
      <span className="font-body text-xs uppercase tracking-[0.3em] text-muted">{t.pausedHint}</span>
    </button>
  )
}
