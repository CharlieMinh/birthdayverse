/**
 * Runtime shape consumed by the experience. A stored BirthdayProfile (see
 * src/profile/schema.ts) is resolved into this, with the theme preset expanded
 * and every default filled in. Scene components only read this.
 */

export type SceneId = 'invitation' | 'gallery' | 'voice' | 'cake' | 'finale'
export type Lang = 'vi' | 'en'

export interface Person {
  /** Full name as it should appear in the finale headline. */
  name: string
  /** Short form used in intimate copy ("For Alex"). Falls back to `name`. */
  shortName?: string
}

export interface MemoryPhoto {
  /** Absolute URL or a path under /public. */
  src: string
  /** Describes the photo for screen readers. */
  alt: string
  caption?: string
  /** Optional secondary line (date, place). */
  detail?: string
  /** CSS object-position, e.g. "50% 30%" to keep a face in frame. */
  focus?: string
}

export interface Caption {
  /** Seconds from the start of the voice message. */
  start: number
  end: number
  text: string
}

export interface VoiceMessage {
  /** Recorded message. Without it the captions play as a silent letter. */
  src?: string
  /** Who the message is from. */
  from: string
  captions: Caption[]
}

export interface ThemeColors {
  bg: string
  surface: string
  text: string
  muted: string
  accent: string
  rose: string
  glow: string
  /** Envelope paper, light and dark. */
  env1: string
  env2: string
}

export type AmbientKind = 'stars' | 'petals' | 'bokeh'

export interface Theme {
  id: string
  colors: ThemeColors
  fonts: { display: string; body: string }
  /** Google Fonts stylesheet for the two families above. */
  fontsHref: string
  /** Hex colors used by confetti, fireworks and ambient particles. */
  celebration: string[]
  ambient: AmbientKind
  /** CSS background layered under every scene. */
  backdrop: string
}

export interface Track {
  id: string
  src: string
  name?: string
  volume: number
}

export interface Cue {
  src: string
  volume: number
  /** Lower the music while the cue plays. */
  duck: boolean
}

export type CueName = 'open' | 'blow' | 'finale'

export interface AudioConfig {
  /** Uploaded music. Scenes pick from these. */
  tracks: Track[]
  /**
   * Which track plays from each scene on. A track id switches (crossfade),
   * null fades to silence, a missing entry keeps whatever is playing.
   */
  sceneMusic: Partial<Record<SceneId, string | null>>
  /** With no tracks at all: "musicbox" plays a synthesized melody, "none" stays silent. */
  fallback: 'musicbox' | 'none'
  /** One-off sounds at key moments (e.g. a song recorded by friends at the finale). */
  cues: Partial<Record<CueName, Cue>>
  voiceVolume: number
  ducking: {
    /** Music volume multiplier while a voice or ducking cue plays (0–1). */
    level: number
    attack: number
    release: number
  }
  /** Synthesized chimes, whooshes and firework pops. */
  effects: { enabled: boolean; volume: number }
}

export interface SceneTimings {
  /** Seconds of intro animation before the envelope becomes tappable. */
  invitationIntro: number
  /** Seconds each gallery photo stays on screen. */
  photoSeconds: number
  /** Length of a voice message that has neither audio nor captions. */
  voiceFallback: number
  /** Pause between consecutive voice messages. */
  voiceGap: number
  /** Quiet after the last voice message before moving on. */
  voiceTail: number
  cakeIntro: number
  /** Seconds of finale before the replay prompt appears. */
  finale: number
  crossfade: number
}

export interface BirthdayConfig {
  meta: { title: string; lang: Lang }
  recipient: Person & { age?: number; portrait?: string }
  sender: Person
  invitation: {
    eyebrow: string
    title: string
    /** Text on the letter that slides out of the envelope. */
    letter: string
    hint: string
    preparingHint: string
  }
  gallery: { title: string; photos: MemoryPhoto[] }
  voice: { eyebrow: string; messages: VoiceMessage[] }
  cake: { candles: number; title: string; hint: string; afterBlow: string }
  finale: { headline: string; message: string; signature: string; replayLabel: string }
  audio: AudioConfig
  theme: Theme
  timings: SceneTimings
  /** Recipient can save a keepsake card and a ZIP of photos and messages. */
  keepsake: { enabled: boolean }
  /** Ask the browser for full screen when the envelope is opened. */
  requestFullscreenOnStart: boolean
}
