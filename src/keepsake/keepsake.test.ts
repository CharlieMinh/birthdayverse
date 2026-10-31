import { describe, expect, it } from 'vitest'
import { MUSIC_LIBRARY, musicCredits } from '../audio/library'
import { demoProfile } from '../profile/demo'
import { normalizeProfile, resolveProfile } from '../profile/schema'
import { keepsakeLetter } from './bundle'
import { gridLayout, wrapLines } from './card'

describe('keepsake setting', () => {
  it('is on by default and can be switched off', () => {
    expect(normalizeProfile({}).keepsake.enabled).toBe(true)
    expect(normalizeProfile({ keepsake: { enabled: false } }).keepsake.enabled).toBe(false)
  })
})

describe('music library', () => {
  it('serves every track from /music and credits only library tracks once each', () => {
    for (const t of MUSIC_LIBRARY) expect(t.file).toMatch(/^\/music\/[a-z0-9-]+\.mp3$/)
    const credits = musicCredits(['/music/carefree.mp3', '/music/carefree.mp3', 'https://x.blob/my-song.mp3'])
    expect(credits).toEqual(['“Carefree” – Kevin MacLeod (incompetech.com), CC BY 4.0'])
  })
})

describe('keepsake letter', () => {
  it('includes the closing message, every captioned wish and the date', () => {
    const config = resolveProfile(demoProfile)
    const text = keepsakeLetter(config, new Date(2026, 9, 31), [])
    expect(text).toContain(config.finale.message)
    expect(text).toContain('Từ Lan')
    expect(text).toContain('Tuổi mới thật nhiều niềm vui')
    expect(text).toContain('31/10/2026')
  })

  it('lists files that could not be downloaded', () => {
    const text = keepsakeLetter(resolveProfile(demoProfile), new Date(), ['Ảnh 3'])
    expect(text).toContain('Ảnh 3')
  })
})

describe('card layout helpers', () => {
  it('picks a grid for 1–6 photos', () => {
    expect(gridLayout(1)).toEqual({ cols: 1, rows: 1 })
    expect(gridLayout(4)).toEqual({ cols: 2, rows: 2 })
    expect(gridLayout(6)).toEqual({ cols: 3, rows: 2 })
  })

  it('wraps text and ellipsises overflow', () => {
    const measure = (s: string) => s.length * 10
    expect(wrapLines(measure, 'một hai ba bốn năm sáu', 100, 5)).toEqual(['một hai ba', 'bốn năm', 'sáu'])
    const cut = wrapLines(measure, 'một hai ba bốn năm sáu bảy tám', 100, 2)
    expect(cut).toHaveLength(2)
    expect(cut[1].endsWith('…')).toBe(true)
  })
})
