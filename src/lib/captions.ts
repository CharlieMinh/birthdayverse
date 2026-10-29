import type { Caption } from '../config/types'

/** Index of the caption visible at `time`, or -1 between captions. */
export function captionIndexAt(captions: Caption[], time: number): number {
  return captions.findIndex((c) => time >= c.start && time < c.end)
}

/** Length of one voice message on screen, in seconds (without the gap after it). */
export function voiceMessageLength(opts: {
  voiceDuration: number | null
  captions: Caption[]
  fallback: number
}): number {
  const lastCaption = opts.captions[opts.captions.length - 1]?.end ?? 0
  const body = opts.voiceDuration ?? (lastCaption > 0 ? lastCaption + 0.5 : opts.fallback)
  return Math.max(body, lastCaption)
}

/**
 * Splits a transcript into sentence captions spread across `duration` in
 * proportion to their length. A starting point the Studio lets you adjust.
 */
export function autoCaptions(text: string, duration: number): Caption[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+|\n+/)
    .flatMap((s) => splitLong(s.trim()))
    .filter(Boolean)
  if (sentences.length === 0 || !(duration > 0)) return []

  const lead = Math.min(0.3, duration * 0.05)
  const gap = 0.25
  const usable = Math.max(0.5, duration - lead - gap * (sentences.length - 1))
  const total = sentences.reduce((n, s) => n + s.length, 0)
  const out: Caption[] = []
  let t = lead
  for (const s of sentences) {
    const len = (s.length / total) * usable
    out.push({ start: round(t), end: round(t + len), text: s })
    t += len + gap
  }
  return out
}

/** Keeps captions readable on a phone: break very long sentences at commas or midpoint. */
function splitLong(sentence: string, max = 90): string[] {
  if (sentence.length <= max) return [sentence]
  const comma = sentence.lastIndexOf(', ', max)
  const cut = comma > max / 3 ? comma + 1 : sentence.lastIndexOf(' ', max)
  if (cut <= 0) return [sentence]
  return [sentence.slice(0, cut).trim(), ...splitLong(sentence.slice(cut).trim(), max)]
}

const round = (n: number) => Math.round(n * 100) / 100
