import { gsap } from 'gsap'
import type { BirthdayConfig, SceneId } from '../config/types'
import type { AudioEngine } from '../audio/AudioEngine'

export const SCENE_ORDER: readonly SceneId[] = ['invitation', 'gallery', 'voice', 'cake', 'finale']

/** The scenes this page actually has: gallery and voice are skipped when empty. */
export function scenesFor(config: BirthdayConfig): SceneId[] {
  return SCENE_ORDER.filter(
    (s) => (s !== 'gallery' || config.gallery.photos.length > 0) && (s !== 'voice' || config.voice.messages.length > 0),
  )
}

/**
 * idle     – waiting on the envelope (nothing audible yet)
 * playing  – the experience is running
 * paused   – everything frozen: GSAP, canvases and audio
 * ended    – finale finished; replay available
 */
export type DirectorStatus = 'idle' | 'playing' | 'paused' | 'ended'

export interface DirectorState {
  sceneIndex: number
  status: DirectorStatus
  muted: boolean
  /** Bumps on replay so every scene remounts with fresh timelines. */
  runId: number
}

const MUTE_KEY = 'birthdayverse:muted'

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Single source of truth for where the experience is.
 *
 * Scenes own their local GSAP timelines and report completion here; the
 * director decides what comes next. Pausing freezes GSAP's global timeline
 * (which every scene timeline and gsap.delayedCall lives on) and suspends the
 * AudioContext, so there are no stray timers to chase.
 */
export class Director {
  private state: DirectorState = { sceneIndex: 0, status: 'idle', muted: readMuted(), runId: 0 }
  private listeners = new Set<() => void>()
  private statusBeforePause: DirectorStatus = 'playing'

  constructor(
    readonly audio: AudioEngine,
    readonly order: readonly SceneId[] = SCENE_ORDER,
  ) {
    audio.setMuted(this.state.muted)
  }

  getState = (): DirectorState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  get scene(): SceneId {
    return this.order[this.state.sceneIndex]
  }

  get isPaused(): boolean {
    return this.state.status === 'paused'
  }

  /** The envelope tap. Runs inside the gesture so audio can unlock. */
  begin(): void {
    if (this.state.status !== 'idle') return
    this.audio.unlock()
    this.audio.enterScene(this.scene)
    void this.audio.playCue('open')
    this.set({ status: 'playing' })
  }

  /**
   * Called by a scene when it has finished. Ignored if that scene is no
   * longer current (e.g. a late callback from a scene fading out).
   */
  complete(scene: SceneId): void {
    if (scene !== this.scene || this.state.status === 'idle') return
    const next = this.state.sceneIndex + 1
    if (next >= this.order.length) {
      this.set({ status: 'ended' })
      return
    }
    this.enter(this.order[next])
    this.set({ sceneIndex: next })
  }

  /** Jump straight to a scene (dev previews via ?scene=). */
  jumpTo(scene: SceneId): void {
    const index = this.order.indexOf(scene)
    if (index < 0) return
    if (this.state.status === 'paused') this.resume()
    if (index > 0) this.enter(scene)
    this.set({ sceneIndex: index, runId: this.state.runId + 1, status: index === 0 ? 'idle' : 'playing' })
  }

  pause(): void {
    if (this.state.status !== 'playing' && this.state.status !== 'ended') return
    this.statusBeforePause = this.state.status
    gsap.globalTimeline.pause()
    this.audio.pause()
    this.set({ status: 'paused' })
  }

  /** Must be called from a gesture so a suspended AudioContext can resume on iOS. */
  resume(): void {
    if (this.state.status !== 'paused') return
    gsap.globalTimeline.resume()
    this.audio.resume()
    this.set({ status: this.statusBeforePause })
  }

  togglePause(): void {
    if (this.isPaused) this.resume()
    else this.pause()
  }

  setMuted(muted: boolean): void {
    this.audio.setMuted(muted)
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      /* storage unavailable: mute still applies for this visit */
    }
    this.set({ muted })
  }

  replay(): void {
    if (this.state.status === 'paused') this.resume()
    this.audio.reset()
    this.set({ sceneIndex: 0, status: 'idle', runId: this.state.runId + 1 })
  }

  /** Scene-level audio: switch music and fire the finale cue. */
  private enter(scene: SceneId): void {
    this.audio.enterScene(scene)
    if (scene === 'finale') void this.audio.playCue('finale')
  }

  private set(patch: Partial<DirectorState>): void {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }
}
