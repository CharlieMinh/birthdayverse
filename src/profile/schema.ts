import type {
  AudioConfig,
  BirthdayConfig,
  Caption,
  Cue,
  CueName,
  Lang,
  MemoryPhoto,
  SceneId,
  SceneTimings,
  Track,
  VoiceMessage,
} from '../config/types'
import { THEME_PRESETS, isThemeId, type ThemeId } from '../theme/presets.js'
import { COPY_DEFAULTS } from './defaults.js'

/**
 * What the Studio edits and the API stores: one birthday page. Pure data, so
 * this module is shared by the browser and the server. Everything that comes
 * in (from JSON, from a form) goes through normalizeProfile() first.
 */
export interface BirthdayProfile {
  version: 1
  /** Secret part of the link: /b/<slug>. */
  slug: string
  published: boolean
  updatedAt: string
  lang: Lang
  themeId: ThemeId
  recipient: { name: string; shortName?: string; age?: number; portrait?: string }
  sender: { name: string }
  invitation: BirthdayConfig['invitation']
  gallery: { title: string; photos: MemoryPhoto[] }
  voice: { eyebrow: string; messages: VoiceMessage[] }
  cake: BirthdayConfig['cake']
  finale: BirthdayConfig['finale']
  audio: AudioConfig
  timings: SceneTimings
  /** Lets the recipient save a card and a ZIP of the photos and messages. */
  keepsake: { enabled: boolean }
}

/** One row in the Studio's page list. */
export interface ProfileSummary {
  slug: string
  name: string
  themeId: ThemeId
  lang: Lang
  published: boolean
  updatedAt: string
  portrait?: string
  photos: number
  voices: number
}

export const LIMITS = {
  photos: 60,
  voices: 30,
  tracks: 12,
  captions: 80,
  text: 400,
  longText: 2000,
  url: 2048,
}

export const DEFAULT_TIMINGS: SceneTimings = {
  invitationIntro: 4,
  photoSeconds: 5,
  voiceFallback: 5,
  voiceGap: 1.2,
  voiceTail: 1.5,
  cakeIntro: 3,
  finale: 20,
  crossfade: 1.2,
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/
const SCENES: SceneId[] = ['invitation', 'gallery', 'voice', 'cake', 'finale']
const CUES: CueName[] = ['open', 'blow', 'finale']

export function isValidSlug(value: unknown): value is string {
  return typeof value === 'string' && SLUG_RE.test(value)
}

// ── Small, strict readers ────────────────────────────────────────────────

type Rec = Record<string, unknown>
const obj = (v: unknown): Rec => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {})

function str(v: unknown, fallback: string, max = LIMITS.text): string {
  return typeof v === 'string' ? v.slice(0, max) : fallback
}

function optStr(v: unknown, max = LIMITS.text): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function list<T>(v: unknown, read: (item: unknown, index: number) => T | null, max: number): T[] {
  if (!Array.isArray(v)) return []
  const out: T[] = []
  for (const [i, item] of v.slice(0, max).entries()) {
    const r = read(item, i)
    if (r !== null) out.push(r)
  }
  return out
}

/** Media URLs: https or a same-site path. Anything else (javascript:, data:, //) is dropped. */
export function safeUrl(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  if (s.length === 0 || s.length > LIMITS.url) return undefined
  if (s.startsWith('https://')) return s
  if (s.startsWith('/') && !s.startsWith('//')) return s
  return undefined
}

const readCaption = (v: unknown): Caption | null => {
  const c = obj(v)
  const text = str(c.text, '').trim()
  if (!text) return null
  const start = num(c.start, 0, 0, 3600)
  const end = num(c.end, start + 3, start + 0.2, 3600)
  return { start, end, text }
}

const readPhoto = (v: unknown, i: number): MemoryPhoto | null => {
  const p = obj(v)
  const src = safeUrl(p.src)
  if (!src) return null
  return {
    src,
    alt: str(p.alt, `Memory ${i + 1}`),
    caption: optStr(p.caption),
    detail: optStr(p.detail),
    focus: typeof p.focus === 'string' && /^\d{1,3}% \d{1,3}%$/.test(p.focus) ? p.focus : undefined,
  }
}

const readVoice = (v: unknown): VoiceMessage | null => {
  const m = obj(v)
  const src = safeUrl(m.src)
  const captions = list(m.captions, readCaption, LIMITS.captions).sort((a, b) => a.start - b.start)
  const from = str(m.from, '').trim()
  if (!src && captions.length === 0 && !from) return null
  return { src, from, captions }
}

const readTrack = (v: unknown, i: number): Track | null => {
  const t = obj(v)
  const src = safeUrl(t.src)
  if (!src) return null
  const id = typeof t.id === 'string' && /^[\w-]{1,40}$/.test(t.id) ? t.id : `track-${i + 1}`
  return { id, src, name: optStr(t.name, 120), volume: num(t.volume, 0.6, 0, 1) }
}

const readCue = (v: unknown): Cue | undefined => {
  const c = obj(v)
  const src = safeUrl(c.src)
  return src ? { src, volume: num(c.volume, 1, 0, 1), duck: bool(c.duck, true) } : undefined
}

function readAudio(v: unknown): AudioConfig {
  const a = obj(v)
  const tracks = list(a.tracks, readTrack, LIMITS.tracks)
  // Keep ids unique so scene mapping stays unambiguous.
  const seen = new Set<string>()
  for (const t of tracks) {
    while (seen.has(t.id)) t.id = `${t.id}-x`
    seen.add(t.id)
  }
  const sm = obj(a.sceneMusic)
  const sceneMusic: AudioConfig['sceneMusic'] = {}
  for (const s of SCENES) {
    if (sm[s] === null) sceneMusic[s] = null
    else if (typeof sm[s] === 'string' && seen.has(sm[s] as string)) sceneMusic[s] = sm[s] as string
  }
  const rawCues = obj(a.cues)
  const cues: AudioConfig['cues'] = {}
  for (const c of CUES) {
    const cue = readCue(rawCues[c])
    if (cue) cues[c] = cue
  }
  const d = obj(a.ducking)
  const e = obj(a.effects)
  return {
    tracks,
    sceneMusic,
    fallback: a.fallback === 'none' ? 'none' : 'musicbox',
    cues,
    voiceVolume: num(a.voiceVolume, 1, 0, 1),
    ducking: { level: num(d.level, 0.18, 0, 1), attack: num(d.attack, 0.8, 0, 5), release: num(d.release, 1.6, 0, 5) },
    effects: { enabled: bool(e.enabled, true), volume: num(e.volume, 0.5, 0, 1) },
  }
}

function readTimings(v: unknown): SceneTimings {
  const t = obj(v)
  const d = DEFAULT_TIMINGS
  return {
    invitationIntro: num(t.invitationIntro, d.invitationIntro, 1, 15),
    photoSeconds: num(t.photoSeconds, d.photoSeconds, 2, 20),
    voiceFallback: num(t.voiceFallback, d.voiceFallback, 2, 60),
    voiceGap: num(t.voiceGap, d.voiceGap, 0, 10),
    voiceTail: num(t.voiceTail, d.voiceTail, 0, 10),
    cakeIntro: num(t.cakeIntro, d.cakeIntro, 1, 15),
    finale: num(t.finale, d.finale, 5, 120),
    crossfade: num(t.crossfade, d.crossfade, 0.3, 4),
  }
}

/** Turns anything (stored JSON, request body, partial draft) into a complete, safe profile. */
export function normalizeProfile(raw: unknown, slugOverride?: string): BirthdayProfile {
  const p = obj(raw)
  const lang: Lang = p.lang === 'en' ? 'en' : 'vi'
  const copy = COPY_DEFAULTS[lang]
  const r = obj(p.recipient)
  const inv = obj(p.invitation)
  const gal = obj(p.gallery)
  const voice = obj(p.voice)
  const cake = obj(p.cake)
  const fin = obj(p.finale)
  const slug = slugOverride ?? (isValidSlug(p.slug) ? p.slug : 'draft')
  const name = str(r.name, '', 120).trim()
  const age = num(r.age, NaN, 0, 150)

  return {
    version: 1,
    slug,
    published: bool(p.published, false),
    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt.slice(0, 40) : new Date(0).toISOString(),
    lang,
    themeId: isThemeId(p.themeId) ? p.themeId : 'starry',
    recipient: {
      name,
      shortName: optStr(r.shortName, 60),
      age: Number.isFinite(age) ? Math.round(age) : undefined,
      portrait: safeUrl(r.portrait),
    },
    sender: { name: str(obj(p.sender).name, '', 120).trim() },
    invitation: {
      eyebrow: str(inv.eyebrow, copy.invitation.eyebrow),
      title: str(inv.title, copy.invitation.title),
      letter: str(inv.letter, copy.invitation.letter, LIMITS.longText),
      hint: str(inv.hint, copy.invitation.hint),
      preparingHint: str(inv.preparingHint, copy.invitation.preparingHint),
    },
    gallery: {
      title: str(gal.title, copy.gallery.title),
      photos: list(gal.photos, readPhoto, LIMITS.photos),
    },
    voice: {
      eyebrow: str(voice.eyebrow, copy.voice.eyebrow),
      messages: list(voice.messages, readVoice, LIMITS.voices),
    },
    cake: {
      candles: Math.round(num(cake.candles, 5, 1, 12)),
      title: str(cake.title, copy.cake.title),
      hint: str(cake.hint, copy.cake.hint),
      afterBlow: str(cake.afterBlow, copy.cake.afterBlow),
    },
    finale: {
      headline: str(fin.headline, copy.finale.headline),
      message: str(fin.message, copy.finale.message, LIMITS.longText),
      signature: str(fin.signature, copy.finale.signature),
      replayLabel: str(fin.replayLabel, copy.finale.replayLabel),
    },
    audio: readAudio(p.audio),
    timings: readTimings(p.timings),
    keepsake: { enabled: bool(obj(p.keepsake).enabled, true) },
  }
}

/** Expands a stored profile into what the experience runs on. */
export function resolveProfile(profile: BirthdayProfile): BirthdayConfig {
  const copy = COPY_DEFAULTS[profile.lang]
  const who = profile.recipient.shortName || profile.recipient.name
  return {
    meta: { title: who ? copy.titleFor(who) : copy.titleGeneric, lang: profile.lang },
    recipient: { ...profile.recipient, name: profile.recipient.name || copy.recipientFallback },
    sender: profile.sender,
    invitation: profile.invitation,
    gallery: profile.gallery,
    voice: profile.voice,
    cake: profile.cake,
    finale: profile.finale,
    audio: profile.audio,
    theme: THEME_PRESETS[profile.themeId],
    timings: profile.timings,
    keepsake: profile.keepsake,
    requestFullscreenOnStart: false,
  }
}

/** A fresh profile in the given language with the default copy filled in. */
export function blankProfile(slug: string, lang: Lang = 'vi'): BirthdayProfile {
  return normalizeProfile({ slug, lang })
}
