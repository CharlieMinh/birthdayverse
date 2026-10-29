import { useEffect, useState, type ReactNode } from 'react'
import { useDirector, useDirectorState } from '../engine/DirectorContext'
import { useUi } from '../config/ConfigContext'
import { CollapseIcon, ExpandIcon, MutedIcon, PauseIcon, PlayIcon, ReplayIcon, SoundIcon } from './Icons'

const canFullscreen = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen

function IconButton(props: { label: string; onClick: () => void; children: ReactNode; pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      aria-pressed={props.pressed}
      title={props.label}
      onClick={props.onClick}
      className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 bg-bg/40 text-ink/85 backdrop-blur-md transition hover:border-accent/50 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95"
    >
      {props.children}
    </button>
  )
}

/** Mute, pause/resume, replay and full screen. Hidden until the envelope opens. */
export function Controls() {
  const director = useDirector()
  const { status, muted } = useDirectorState()
  const [isFullscreen, setFullscreen] = useState(false)
  const t = useUi()

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  if (status === 'idle') return null
  const paused = status === 'paused'

  return (
    <div className="safe-top safe-right fixed right-0 top-0 z-40 flex gap-2 p-3 sm:p-5">
      <IconButton label={muted ? t.unmute : t.mute} pressed={muted} onClick={() => director.setMuted(!muted)}>
        {muted ? <MutedIcon /> : <SoundIcon />}
      </IconButton>
      <IconButton label={paused ? t.resume : t.pause} onClick={() => director.togglePause()}>
        {paused ? <PlayIcon /> : <PauseIcon />}
      </IconButton>
      <IconButton label={t.replayFromStart} onClick={() => director.replay()}>
        <ReplayIcon />
      </IconButton>
      {canFullscreen && (
        <IconButton
          label={isFullscreen ? t.exitFullscreen : t.fullscreen}
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen()
            else void document.documentElement.requestFullscreen().catch(() => undefined)
          }}
        >
          {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
        </IconButton>
      )}
    </div>
  )
}
