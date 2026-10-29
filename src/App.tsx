import { useEffect, useMemo } from 'react'
import { gsap } from 'gsap'
import type { BirthdayConfig, SceneId } from './config/types'
import type { SceneProps } from './scenes/types'
import type { ComponentType } from 'react'
import { ConfigProvider } from './config/ConfigContext'
import { DirectorProvider, useDirector, useDirectorState } from './engine/DirectorContext'
import { AssetsProvider } from './engine/AssetsContext'
import { Director, scenesFor } from './engine/director'
import { AudioEngine } from './audio/AudioEngine'
import { Stage } from './components/Stage'
import { Controls } from './components/Controls'
import { PauseOverlay } from './components/PauseOverlay'
import { ProgressDots } from './components/ProgressDots'
import { FxCanvas } from './components/FxCanvas'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useReducedMotion } from './hooks/useReducedMotion'
import { InvitationScene } from './scenes/InvitationScene'
import { GalleryScene } from './scenes/GalleryScene'
import { VoiceScene } from './scenes/VoiceScene'
import { CakeScene } from './scenes/CakeScene'
import { FinaleScene } from './scenes/FinaleScene'

const SCENES: Record<SceneId, ComponentType<SceneProps>> = {
  invitation: InvitationScene,
  gallery: GalleryScene,
  voice: VoiceScene,
  cake: CakeScene,
  finale: FinaleScene,
}

/** Keyboard shortcuts and auto-pause when the tab is hidden. */
function useGlobalControls() {
  const director = useDirector()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const state = director.getState()
      if (state.status === 'idle') return
      if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        // Let Space activate a focused button normally.
        if (e.key === ' ' && document.activeElement instanceof HTMLButtonElement) return
        e.preventDefault()
        director.togglePause()
      } else if (e.key.toLowerCase() === 'm') {
        director.setMuted(!state.muted)
      }
    }
    // Resuming needs a tap (iOS audio rules), so hidden → pause, visible → wait.
    const onVisibility = () => {
      if (document.hidden) director.pause()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [director])
}

function Experience({ config }: { config: BirthdayConfig }) {
  const reduced = useReducedMotion()
  const { status } = useDirectorState()
  useGlobalControls()

  return (
    <main
      className="fixed inset-0 overflow-hidden bg-bg text-ink"
      style={{ backgroundImage: 'var(--backdrop)' }}
      data-status={status}
    >
      <FxCanvas ambient={config.theme.ambient} colors={config.theme.celebration} reducedMotion={reduced} />
      <Stage scenes={SCENES} />
      <div className="vignette pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <ProgressDots />
      <Controls />
      <PauseOverlay />
    </main>
  )
}

export default function App({ config }: { config: BirthdayConfig }) {
  const director = useMemo(() => {
    const voices = config.voice.messages.flatMap((m) => (m.src ? [m.src] : []))
    return new Director(new AudioEngine(config.audio, voices), scenesFor(config))
  }, [config])
  if (import.meta.env.DEV) {
    // Test hooks for driving the experience from the browser console.
    Object.assign(window, { __director: director, __gsap: gsap })
  }

  return (
    <ErrorBoundary message={config.finale.headline} lang={config.meta.lang}>
      <ConfigProvider config={config}>
        <DirectorProvider director={director}>
          <AssetsProvider config={config} audio={director.audio}>
            <Experience config={config} />
          </AssetsProvider>
        </DirectorProvider>
      </ConfigProvider>
    </ErrorBoundary>
  )
}
