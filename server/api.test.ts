import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApi } from './api'
import { LocalStorage } from './localStorage'
import { createSessionToken, verifySessionToken } from './session'

const BASE = 'http://localhost:5173'
let root: string
let api: ReturnType<typeof createApi>

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'bv-api-'))
  api = createApi(new LocalStorage(root), { adminPassword: 'correct horse', sessionSecret: 's3cret', secureCookies: false })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function login(): Promise<string> {
  const res = await api(
    new Request(`${BASE}/api/login`, { method: 'POST', body: JSON.stringify({ password: 'correct horse' }) }),
  )
  expect(res.status).toBe(200)
  return res.headers.get('set-cookie')!.split(';')[0]
}

const call = (cookie: string, pathname: string, init: RequestInit = {}) =>
  api(new Request(`${BASE}${pathname}`, { ...init, headers: { cookie, ...(init.headers ?? {}) } }))

describe('auth', () => {
  it('rejects a wrong password and protects admin routes', async () => {
    const bad = await api(new Request(`${BASE}/api/login`, { method: 'POST', body: JSON.stringify({ password: 'nope' }) }))
    expect(bad.status).toBe(401)
    expect((await api(new Request(`${BASE}/api/profiles`))).status).toBe(401)
  })

  it('accepts the right password and reports the session', async () => {
    const cookie = await login()
    const res = await call(cookie, '/api/session')
    expect(await res.json()).toMatchObject({ authenticated: true, storage: 'local' })
  })

  it('refuses cross-site mutations', async () => {
    const cookie = await login()
    const res = await call(cookie, '/api/profiles', { method: 'POST', body: '{}', headers: { origin: 'https://evil.example' } })
    expect(res.status).toBe(403)
  })

  it('reports when no password is configured', async () => {
    const open = createApi(new LocalStorage(root), { secureCookies: false })
    const res = await open(new Request(`${BASE}/api/login`, { method: 'POST', body: '{"password":""}' }))
    expect(res.status).toBe(503)
  })

  it('expires and verifies tokens', () => {
    const token = createSessionToken('k', 0)
    expect(verifySessionToken(token, 'k', 1000)).toBe(true)
    expect(verifySessionToken(token, 'other', 1000)).toBe(false)
    expect(verifySessionToken(token, 'k', 40 * 24 * 3600 * 1000)).toBe(false)
    expect(verifySessionToken(`${token}x`, 'k', 1000)).toBe(false)
  })
})

describe('profiles', () => {
  it('creates, saves, publishes, lists and deletes a page', async () => {
    const cookie = await login()
    const created = await (
      await call(cookie, '/api/profiles', { method: 'POST', body: JSON.stringify({ name: 'Minh Anh' }) })
    ).json()
    expect(created.slug).toMatch(/^minh-anh-[a-z2-9]{8}$/)
    expect(created.published).toBe(false)

    // Drafts are hidden from the public route, visible in preview when signed in.
    expect((await api(new Request(`${BASE}/api/p/${created.slug}`))).status).toBe(404)
    expect((await call(cookie, `/api/p/${created.slug}?preview=1`)).status).toBe(200)

    const saved = await (
      await call(cookie, `/api/profiles/${created.slug}`, {
        method: 'PUT',
        body: JSON.stringify({ ...created, published: true, themeId: 'neon', gallery: { photos: [{ src: 'javascript:x' }] } }),
      })
    ).json()
    expect(saved.themeId).toBe('neon')
    expect(saved.gallery.photos).toEqual([])

    const pub = await api(new Request(`${BASE}/api/p/${created.slug}`))
    expect(pub.status).toBe(200)
    expect(pub.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate')
    expect(pub.headers.get('vercel-cdn-cache-control')).toContain('max-age=60')

    const list = await (await call(cookie, '/api/profiles')).json()
    expect(list.map((p: { slug: string }) => p.slug)).toEqual([created.slug])

    expect((await call(cookie, `/api/profiles/${created.slug}`, { method: 'DELETE' })).status).toBe(200)
    expect((await api(new Request(`${BASE}/api/p/${created.slug}`))).status).toBe(404)
  })

  it('duplicates a page under a new secret link', async () => {
    const cookie = await login()
    const a = await (await call(cookie, '/api/profiles', { method: 'POST', body: JSON.stringify({ name: 'A' }) })).json()
    await call(cookie, `/api/profiles/${a.slug}`, { method: 'PUT', body: JSON.stringify({ ...a, themeId: 'gold' }) })
    const b = await (
      await call(cookie, '/api/profiles', { method: 'POST', body: JSON.stringify({ name: 'B', copyFrom: a.slug }) })
    ).json()
    expect(b.slug).not.toBe(a.slug)
    expect(b.themeId).toBe('gold')
    expect(b.recipient.name).toBe('B')
  })

  it('rejects invalid slugs', async () => {
    const cookie = await login()
    expect((await call(cookie, '/api/profiles/..%2Fetc')).status).toBe(404)
    expect((await api(new Request(`${BASE}/api/p/UPPER`))).status).toBe(404)
  })

  it('handles the Vercel rewrite form of the path', async () => {
    const res = await api(new Request(`${BASE}/api?__path=session`))
    expect(res.status).toBe(200)
  })
})

describe('uploads', () => {
  it('stores media under the page and keeps media a copy still uses', async () => {
    const cookie = await login()
    const a = await (await call(cookie, '/api/profiles', { method: 'POST', body: JSON.stringify({ name: 'A' }) })).json()
    const up = await call(cookie, `/api/upload?slug=${a.slug}&name=song.mp3`, {
      method: 'POST',
      body: new Uint8Array([1, 2, 3]),
      headers: { 'content-type': 'audio/mpeg' },
    })
    expect(up.status).toBe(200)
    const { url } = await up.json()
    expect(url).toMatch(new RegExp(`^/__data/assets/${a.slug}/`))

    const withSong = { ...a, audio: { tracks: [{ id: 'song', src: url }] } }
    await call(cookie, `/api/profiles/${a.slug}`, { method: 'PUT', body: JSON.stringify(withSong) })
    const b = await (
      await call(cookie, '/api/profiles', { method: 'POST', body: JSON.stringify({ name: 'B', copyFrom: a.slug }) })
    ).json()
    expect(b.audio.tracks[0].src).toBe(url)

    await call(cookie, `/api/profiles/${a.slug}`, { method: 'DELETE' })
    const storage = new LocalStorage(root)
    expect((await storage.list(`assets/${a.slug}/`)).map((i) => i.url)).toEqual([url])
  })

  it('refuses unknown pages and file types', async () => {
    const cookie = await login()
    const a = await (await call(cookie, '/api/profiles', { method: 'POST', body: '{}' })).json()
    const badType = await call(cookie, `/api/upload?slug=${a.slug}&name=x.exe`, {
      method: 'POST',
      body: new Uint8Array([1]),
      headers: { 'content-type': 'application/x-msdownload' },
    })
    expect(badType.status).toBe(415)
    const badSlug = await call(cookie, `/api/upload?slug=nope-nope&name=a.png`, {
      method: 'POST',
      body: new Uint8Array([1]),
      headers: { 'content-type': 'image/png' },
    })
    expect(badSlug.status).toBe(404)
  })
})
