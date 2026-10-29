import { describe, expect, it } from 'vitest'
import { demoProfile } from '../profile/demo'
import { resolveProfile } from '../profile/schema'
import { validateConfig } from './validate'

const config = () => structuredClone(resolveProfile(demoProfile))

describe('validateConfig', () => {
  it('accepts the demo profile', () => {
    expect(validateConfig(config())).toEqual([])
  })

  it('flags overlapping and inverted captions', () => {
    const c = config()
    c.voice.messages[0].captions = [
      { start: 0, end: 4, text: 'a' },
      { start: 3, end: 2, text: 'b' },
    ]
    const problems = validateConfig(c)
    expect(problems).toContain('voice.messages[0].captions[1] ends before it starts')
    expect(problems).toContain('voice.messages[0].captions[1] overlaps the previous caption')
  })

  it('notes scenes that will be skipped', () => {
    const c = config()
    c.gallery.photos = []
    c.voice.messages = []
    const problems = validateConfig(c)
    expect(problems.some((p) => p.startsWith('gallery'))).toBe(true)
    expect(problems.some((p) => p.startsWith('no voice'))).toBe(true)
  })
})
