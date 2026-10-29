import type { AudioConfig, CueName, SceneId } from '../config/types'
import { MusicBox } from './musicBox'
import { playEffect, type EffectName } from './sfx'

const AudioContextCtor: typeof AudioContext | undefined =
  typeof window === 'undefined'
    ? undefined
    : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

const MUSIC_FADE = 1.6

interface TrackPlayer {
  el: HTMLAudioElement
  gain: GainNode | null
  volume: number
  failed: boolean
}

/**
 * Owns all sound. Graph:
 *
 *   track elements → per-track gain ─┐
 *   music box ───────────────────────┴→ musicBus → duck ─┐
 *   voice buffers → voiceGain → analyser ────────────────┼→ master → speakers
 *   cue buffers → cueGain ───────────────────────────────┤
 *   effects → fxGain ────────────────────────────────────┘
 *
 * Volume changes go through GainNodes because HTMLMediaElement.volume is
 * read-only on iOS. Nothing makes a sound until unlock() runs inside a tap.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private duckGain: GainNode | null = null
  private voiceGain: GainNode | null = null
  private cueGain: GainNode | null = null
  private fxGain: GainNode | null = null
  private analyser: AnalyserNode | null = null

  private tracks = new Map<string, TrackPlayer>()
  /** Track id playing now, "musicbox", or null for silence. */
  private current: string | null = null
  private musicBox: MusicBox | null = null
  private musicBoxGain: GainNode | null = null
  private stopTimers = new Map<string, number>()

  private bytes = new Map<string, Promise<ArrayBuffer | null>>()
  private buffers = new Map<string, Promise<AudioBuffer | null>>()
  private voiceSource: AudioBufferSourceNode | null = null
  private voiceStartedAt = 0
  private voiceDuration = 0
  private cueSources = new Set<AudioBufferSourceNode>()
  private duckers = 0

  private muted = false
  private preloading: Promise<void> | null = null

  /** A scene asked for silence; later "keep playing" scenes stay silent too. */
  private silencedByScene = false

  constructor(
    private readonly config: AudioConfig,
    /** Voice message files to preload. */
    private readonly voiceSrcs: string[] = [],
  ) {}

  /** Starts fetching audio (once). Resolves when each file has loaded or failed. */
  preload(): Promise<void> {
    this.preloading ??= this.load()
    return this.preloading
  }

  private load(): Promise<void> {
    const jobs: Promise<unknown>[] = []

    for (const track of this.config.tracks) {
      const el = new Audio()
      el.preload = 'auto'
      el.loop = true
      el.crossOrigin = 'anonymous'
      const player: TrackPlayer = { el, gain: null, volume: track.volume, failed: false }
      this.tracks.set(track.id, player)
      jobs.push(
        new Promise<void>((resolve) => {
          el.addEventListener('canplaythrough', () => resolve(), { once: true })
          el.addEventListener(
            'error',
            () => {
              player.failed = true
              console.warn(`[audio] music failed to load: ${track.src}`)
              resolve()
            },
            { once: true },
          )
        }),
      )
      el.src = track.src
      el.load()
    }

    // Voices and cues are decoded into buffers for sample-accurate timing.
    const clips = new Set<string>()
    for (const src of this.voiceSrcs) clips.add(src)
    for (const c of Object.values(this.config.cues)) if (c) clips.add(c.src)
    for (const src of clips) {
      const job = fetch(src)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .catch((err) => {
          console.warn(`[audio] failed to load: ${src}`, err)
          return null
        })
      this.bytes.set(src, job)
      jobs.push(job)
    }

    return Promise.all(jobs).then(() => undefined)
  }

  /** Must be called synchronously from a user gesture (tap/click/key). */
  unlock(): void {
    if (this.ctx || !AudioContextCtor) {
      void this.ctx?.resume()
      return
    }
    // iOS mutes Web Audio when the ring/silent switch is on, unless the page
    // declares it is playing media (Safari 17+; ignored elsewhere).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) {
      try {
        session.type = 'playback'
      } catch {
        /* unsupported value on this browser */
      }
    }
    const ctx = new AudioContextCtor()
    this.ctx = ctx

    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 1
    this.master.connect(ctx.destination)

    this.duckGain = ctx.createGain()
    this.duckGain.connect(this.master)
    this.musicBus = ctx.createGain()
    this.musicBus.connect(this.duckGain)

    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.82
    this.analyser.connect(this.master)
    this.voiceGain = ctx.createGain()
    this.voiceGain.gain.value = this.config.voiceVolume
    this.voiceGain.connect(this.analyser)

    this.cueGain = ctx.createGain()
    this.cueGain.connect(this.master)

    this.fxGain = ctx.createGain()
    this.fxGain.gain.value = this.config.effects.volume
    this.fxGain.connect(this.master)

    for (const player of this.tracks.values()) {
      player.gain = ctx.createGain()
      player.gain.gain.value = 0
      player.gain.connect(this.musicBus)
      ctx.createMediaElementSource(player.el).connect(player.gain)
      // iOS only lets an element play later if it was started inside a gesture.
      // Gain is 0, so this is silent; it is paused again right away.
      if (!player.failed) {
        player.el
          .play()
          .then(() => {
            if (this.current === null || this.tracks.get(this.current) !== player) player.el.pause()
          })
          .catch(() => undefined)
      }
    }
    void ctx.resume()

    // Decode early so scenes never wait on it.
    for (const [src, job] of this.bytes) {
      this.buffers.set(
        src,
        job.then((b) =>
          b
            ? ctx.decodeAudioData(b).catch((err) => {
                console.warn(`[audio] could not decode: ${src}`, err)
                return null
              })
            : null,
        ),
      )
    }
  }

  get isUnlocked(): boolean {
    return this.ctx !== null
  }

  // ── Music ──────────────────────────────────────────────────────────────

  /**
   * Called as each scene starts. Switches to that scene's track with a
   * crossfade, fades to silence, or keeps the current music.
   */
  enterScene(scene: SceneId): void {
    if (!this.ctx) return
    const { tracks, sceneMusic, fallback } = this.config
    if (tracks.length === 0) {
      // No uploads: the music box plays throughout (unless switched off).
      const want = sceneMusic[scene] === null || fallback === 'none' ? null : 'musicbox'
      this.switchTo(want)
      return
    }
    const mapped = sceneMusic[scene]
    if (mapped === undefined) {
      // First scene with music decides the opening track.
      if (this.current === null && !this.silencedByScene) this.switchTo(tracks[0].id)
      return
    }
    this.silencedByScene = mapped === null
    this.switchTo(mapped)
  }

  private switchTo(next: string | null): void {
    if (next === this.current) return
    const prev = this.current
    this.current = next
    if (prev) this.fadeOut(prev)
    if (next) this.fadeIn(next)
  }

  private fadeIn(id: string): void {
    const { ctx } = this
    if (!ctx) return
    const pending = this.stopTimers.get(id)
    if (pending !== undefined) {
      window.clearTimeout(pending)
      this.stopTimers.delete(id)
    }
    if (id === 'musicbox') {
      if (!this.musicBoxGain && this.musicBus) {
        this.musicBoxGain = ctx.createGain()
        this.musicBoxGain.gain.value = 0
        this.musicBoxGain.connect(this.musicBus)
      }
      if (!this.musicBoxGain) return
      this.musicBox ??= new MusicBox(ctx, this.musicBoxGain)
      this.musicBox.start()
      this.ramp(this.musicBoxGain.gain, 0.55, MUSIC_FADE)
      return
    }
    const player = this.tracks.get(id)
    if (!player?.gain) return
    if (player.failed) {
      // A broken upload shouldn't leave the scene silent.
      if (this.config.fallback === 'musicbox') {
        this.current = 'musicbox'
        this.fadeIn('musicbox')
      }
      return
    }
    player.el.currentTime = 0
    this.ramp(player.gain.gain, player.volume, MUSIC_FADE)
    player.el.play().catch((err) => {
      console.warn('[audio] music playback failed', err)
      player.failed = true
      if (this.current === id && this.config.fallback === 'musicbox') {
        this.current = 'musicbox'
        this.fadeIn('musicbox')
      }
    })
  }

  private fadeOut(id: string): void {
    const gain = id === 'musicbox' ? this.musicBoxGain : this.tracks.get(id)?.gain
    if (gain) this.ramp(gain.gain, 0, MUSIC_FADE)
    // Stop the source once it is silent so it stops using bandwidth and CPU.
    const timer = window.setTimeout(() => {
      this.stopTimers.delete(id)
      if (this.current === id) return
      if (id === 'musicbox') this.musicBox?.stop()
      else this.tracks.get(id)?.el.pause()
    }, MUSIC_FADE * 1000 + 100)
    this.stopTimers.set(id, timer)
  }

  /** Lowers the music under a voice or cue. Calls nest: each `true` needs a `false`. */
  duck(on: boolean): void {
    this.duckers = Math.max(0, this.duckers + (on ? 1 : -1))
    if (!this.duckGain) return
    const { level, attack, release } = this.config.ducking
    const down = this.duckers > 0
    this.ramp(this.duckGain.gain, down ? level : 1, down ? attack : release)
  }

  // ── Voice messages ─────────────────────────────────────────────────────

  /** Resolves with the clip length in seconds, or null if it can't be played. */
  async prepareVoice(src: string | undefined): Promise<number | null> {
    if (!src) return null
    const buffer = await (this.buffers.get(src) ?? Promise.resolve(null))
    return buffer?.duration ?? null
  }

  /** Plays a decoded voice clip from the start. Returns false if unavailable. */
  async playVoice(src: string | undefined): Promise<boolean> {
    if (!src) return false
    const { ctx, voiceGain } = this
    const buffer = await (this.buffers.get(src) ?? Promise.resolve(null))
    if (!ctx || !voiceGain || !buffer) return false
    this.stopVoice()
    const node = ctx.createBufferSource()
    node.buffer = buffer
    node.connect(voiceGain)
    node.onended = () => {
      if (this.voiceSource === node) this.voiceSource = null
    }
    this.voiceStartedAt = ctx.currentTime + 0.05
    this.voiceDuration = buffer.duration
    node.start(this.voiceStartedAt)
    this.voiceSource = node
    return true
  }

  stopVoice(): void {
    if (!this.voiceSource) return
    this.voiceSource.onended = null
    try {
      this.voiceSource.stop()
    } catch {
      /* already stopped */
    }
    this.voiceSource.disconnect()
    this.voiceSource = null
  }

  /** Seconds into the current voice clip, driven by the audio clock (freezes while paused). */
  voiceElapsed(): number | null {
    if (!this.ctx || !this.voiceSource) return null
    return Math.min(Math.max(0, this.ctx.currentTime - this.voiceStartedAt), this.voiceDuration)
  }

  get voiceAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  // ── Cues ───────────────────────────────────────────────────────────────

  /** Plays a configured one-off sound (e.g. a song at the finale), ducking music if asked. */
  async playCue(name: CueName): Promise<void> {
    const cue = this.config.cues[name]
    const { ctx, cueGain } = this
    if (!cue || !ctx || !cueGain) return
    const buffer = await (this.buffers.get(cue.src) ?? Promise.resolve(null))
    if (!buffer || this.ctx !== ctx) return
    const node = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = cue.volume
    node.buffer = buffer
    node.connect(gain).connect(cueGain)
    if (cue.duck) this.duck(true)
    node.onended = () => {
      this.cueSources.delete(node)
      gain.disconnect()
      if (cue.duck) this.duck(false)
    }
    this.cueSources.add(node)
    node.start()
  }

  private stopCues(): void {
    for (const node of this.cueSources) {
      try {
        node.stop()
      } catch {
        /* already stopped */
      }
    }
  }

  // ── Transport ──────────────────────────────────────────────────────────

  pause(): void {
    const player = this.current ? this.tracks.get(this.current) : undefined
    player?.el.pause()
    void this.ctx?.suspend()
  }

  resume(): void {
    void this.ctx?.resume()
    const player = this.current ? this.tracks.get(this.current) : undefined
    if (player && !player.failed) player.el.play().catch(() => undefined)
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master) this.ramp(this.master.gain, muted ? 0 : 1, 0.25)
  }

  effect(name: EffectName): void {
    // A context that is still resuming plays the effect as soon as it can.
    if (!this.config.effects.enabled || !this.ctx || !this.fxGain || this.ctx.state === 'closed') return
    playEffect(this.ctx, this.fxGain, name)
  }

  /** Stops everything and returns to the pre-start state (keeps the unlocked context). */
  reset(): void {
    this.stopVoice()
    this.stopCues()
    this.switchTo(null)
    this.silencedByScene = false
    this.duckers = 0
    if (this.duckGain) this.ramp(this.duckGain.gain, 1, 0.5)
  }

  private ramp(param: AudioParam, value: number, seconds: number): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    param.cancelScheduledValues(now)
    param.setValueAtTime(param.value, now)
    param.linearRampToValueAtTime(value, now + Math.max(seconds, 0.01))
  }
}
