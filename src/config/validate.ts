import type { BirthdayConfig } from './types'

/**
 * Human-readable problems with a resolved config, logged in development.
 * Profiles are already sanitized, so these are content hints, not errors.
 */
export function validateConfig(config: BirthdayConfig): string[] {
  const problems: string[] = []

  if (!config.recipient.name.trim()) problems.push('recipient.name is empty')
  if (config.gallery.photos.length === 0) problems.push('gallery has no photos; the gallery scene is skipped')
  if (config.voice.messages.length === 0) problems.push('no voice messages; the voice scene is skipped')

  config.voice.messages.forEach((m, mi) => {
    m.captions.forEach((c, i) => {
      if (c.end <= c.start) problems.push(`voice.messages[${mi}].captions[${i}] ends before it starts`)
      const prev = m.captions[i - 1]
      if (prev && c.start < prev.end) problems.push(`voice.messages[${mi}].captions[${i}] overlaps the previous caption`)
    })
  })

  const trackIds = new Set(config.audio.tracks.map((t) => t.id))
  for (const [scene, id] of Object.entries(config.audio.sceneMusic)) {
    if (id && !trackIds.has(id)) problems.push(`audio.sceneMusic.${scene} points to a missing track`)
  }
  return problems
}
