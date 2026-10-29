import { describe, expect, it } from 'vitest'
import { blankProfile, isValidSlug, normalizeProfile, resolveProfile, safeUrl } from './schema'
import { makeSlug, randomToken } from './slug'

describe('normalizeProfile', () => {
  it('fills a complete Vietnamese profile from nothing', () => {
    const p = normalizeProfile({})
    expect(p.lang).toBe('vi')
    expect(p.themeId).toBe('starry')
    expect(p.invitation.hint).toBe('Chạm vào phong bì để mở')
    expect(p.gallery.photos).toEqual([])
    expect(p.timings.photoSeconds).toBe(5)
  })

  it('drops unsafe media URLs and keeps safe ones', () => {
    const p = normalizeProfile({
      recipient: { portrait: 'javascript:alert(1)' },
      gallery: {
        photos: [
          { src: 'https://x.public.blob.vercel-storage.com/a.webp' },
          { src: 'data:image/png;base64,AAAA' },
          { src: '//evil.example/a.png' },
          { src: '/photos/memory-01.svg' },
        ],
      },
    })
    expect(p.recipient.portrait).toBeUndefined()
    expect(p.gallery.photos.map((x) => x.src)).toEqual([
      'https://x.public.blob.vercel-storage.com/a.webp',
      '/photos/memory-01.svg',
    ])
  })

  it('clamps numbers and rejects unknown themes', () => {
    const p = normalizeProfile({ themeId: 'nope', cake: { candles: 99 }, timings: { photoSeconds: -3 } })
    expect(p.themeId).toBe('starry')
    expect(p.cake.candles).toBe(12)
    expect(p.timings.photoSeconds).toBe(2)
  })

  it('keeps scene music only when it points at a real track', () => {
    const p = normalizeProfile({
      audio: {
        tracks: [{ id: 'calm', src: 'https://a.b/c.mp3' }],
        sceneMusic: { gallery: 'calm', finale: 'missing', cake: null },
      },
    })
    expect(p.audio.sceneMusic).toEqual({ gallery: 'calm', cake: null })
  })

  it('sorts captions and drops empty ones', () => {
    const p = normalizeProfile({
      voice: {
        messages: [
          {
            from: 'Lan',
            captions: [{ start: 4, end: 6, text: 'b' }, { start: 0, end: 2, text: 'a' }, { text: ' ' }],
          },
        ],
      },
    })
    expect(p.voice.messages[0].captions.map((c) => c.text)).toEqual(['a', 'b'])
  })

  it('resolves the theme preset and title', () => {
    const p = normalizeProfile({ themeId: 'sakura', recipient: { name: 'Minh' } })
    const c = resolveProfile(p)
    expect(c.theme.id).toBe('sakura')
    expect(c.meta.title).toContain('Minh')
  })

  it('creates blank English profiles', () => {
    expect(blankProfile('abc-123', 'en').finale.headline).toBe('Happy Birthday')
  })
})

describe('safeUrl', () => {
  it('accepts https and same-site paths only', () => {
    expect(safeUrl('https://a.b/c')).toBe('https://a.b/c')
    expect(safeUrl('/x.png')).toBe('/x.png')
    expect(safeUrl('http://a.b/c')).toBeUndefined()
    expect(safeUrl(' ')).toBeUndefined()
  })
})

describe('slugs', () => {
  it('builds readable secret slugs from Vietnamese names', () => {
    const s = makeSlug('Đặng Thị Minh Anh', 'abcd2345')
    expect(s).toBe('dang-thi-minh-anh-abcd2345')
    expect(isValidSlug(s)).toBe(true)
  })
  it('falls back when the name has no usable characters', () => {
    expect(makeSlug('🎂', 'abcd2345')).toBe('b-abcd2345')
  })
  it('rejects path tricks', () => {
    expect(isValidSlug('../etc')).toBe(false)
    expect(isValidSlug('a/b')).toBe(false)
    expect(isValidSlug('UPPER')).toBe(false)
  })
  it('generates tokens of the requested length', () => {
    expect(randomToken(10)).toMatch(/^[a-z2-9]{10}$/)
  })
})
