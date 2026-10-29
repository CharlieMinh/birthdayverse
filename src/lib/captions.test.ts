import { describe, expect, it } from 'vitest'
import { autoCaptions, captionIndexAt, voiceMessageLength } from './captions'

const captions = [
  { start: 0.5, end: 3, text: 'one' },
  { start: 4, end: 6, text: 'two' },
]

describe('captionIndexAt', () => {
  it('finds the active caption and returns -1 in gaps', () => {
    expect(captionIndexAt(captions, 0)).toBe(-1)
    expect(captionIndexAt(captions, 1)).toBe(0)
    expect(captionIndexAt(captions, 3.5)).toBe(-1)
    expect(captionIndexAt(captions, 5.9)).toBe(1)
    expect(captionIndexAt(captions, 6)).toBe(-1)
  })
})

describe('voiceMessageLength', () => {
  it('uses the voice duration when there is one', () => {
    expect(voiceMessageLength({ voiceDuration: 20, captions, fallback: 5 })).toBe(20)
  })
  it('runs silent captions to their end', () => {
    expect(voiceMessageLength({ voiceDuration: null, captions, fallback: 5 })).toBe(6.5)
  })
  it('falls back when there is neither audio nor captions', () => {
    expect(voiceMessageLength({ voiceDuration: null, captions: [], fallback: 5 })).toBe(5)
  })
  it('never cuts off a caption that outlasts the audio', () => {
    expect(voiceMessageLength({ voiceDuration: 2, captions, fallback: 5 })).toBe(6)
  })
})

describe('autoCaptions', () => {
  it('splits sentences and spreads them across the duration in order', () => {
    const out = autoCaptions('Chúc mừng sinh nhật! Tuổi mới thật vui nhé. Thương bạn…', 10)
    expect(out.map((c) => c.text)).toEqual(['Chúc mừng sinh nhật!', 'Tuổi mới thật vui nhé.', 'Thương bạn…'])
    for (let i = 1; i < out.length; i++) expect(out[i].start).toBeGreaterThanOrEqual(out[i - 1].end)
    expect(out[out.length - 1].end).toBeLessThanOrEqual(10)
  })
  it('breaks very long sentences', () => {
    const long = 'Một câu rất dài, '.repeat(12).trim()
    expect(autoCaptions(long, 20).length).toBeGreaterThan(1)
  })
  it('returns nothing without text or duration', () => {
    expect(autoCaptions('', 10)).toEqual([])
    expect(autoCaptions('Hello.', 0)).toEqual([])
  })
})
