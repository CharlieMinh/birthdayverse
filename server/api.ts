import { isValidSlug, normalizeProfile, type BirthdayProfile, type ProfileSummary } from '../src/profile/schema.js'
import { makeSlug, randomToken } from '../src/profile/slug.js'
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSessionToken,
  passwordMatches,
  readCookie,
  sessionCookie,
  verifySessionToken,
} from './session.js'
import { PROFILE_PREFIX, assetPrefix, profilePath, type Storage } from './storage.js'

export interface ApiEnv {
  adminPassword?: string
  sessionSecret?: string
  /** Mark cookies Secure (true everywhere except plain-http localhost). */
  secureCookies: boolean
}

const MAX_JSON_BYTES = 512 * 1024
const json = (data: unknown, init?: ResponseInit) => Response.json(data, init)
const error = (status: number, message: string) => json({ error: message }, { status })

/**
 * The whole API as one fetch-style handler: Request in, Response out. The
 * Vercel function (api/index.ts) and the local dev server both mount it.
 *
 *   GET    /api/session              who am I, which storage
 *   POST   /api/login                { password }
 *   POST   /api/logout
 *   GET    /api/p/:slug              public: a published page (drafts with ?preview=1 when signed in)
 *   GET    /api/profiles             admin: list
 *   POST   /api/profiles             admin: create { name, lang, copyFrom? }
 *   GET    /api/profiles/:slug       admin: read
 *   PUT    /api/profiles/:slug       admin: save
 *   DELETE /api/profiles/:slug       admin: delete page and its unshared media
 *   POST   /api/upload?slug=…        admin: upload media for a page
 */
export function createApi(storage: Storage, env: ApiEnv) {
  const configured = Boolean(env.adminPassword && env.sessionSecret)

  const isAdmin = (request: Request) =>
    configured && verifySessionToken(readCookie(request, SESSION_COOKIE), env.sessionSecret!)

  async function readBody(request: Request): Promise<unknown> {
    const length = Number(request.headers.get('content-length') ?? 0)
    if (length > MAX_JSON_BYTES) throw new HttpError(413, 'Body too large')
    const text = await request.text()
    if (text.length > MAX_JSON_BYTES) throw new HttpError(413, 'Body too large')
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      throw new HttpError(400, 'Invalid JSON')
    }
  }

  async function readProfile(slug: string): Promise<BirthdayProfile | null> {
    const raw = await storage.readJson(profilePath(slug))
    return raw ? normalizeProfile(raw, slug) : null
  }

  async function listProfiles(): Promise<BirthdayProfile[]> {
    const items = await storage.list(PROFILE_PREFIX)
    const slugs = items
      .map((i) => /^profiles\/([^/]+)\.json$/.exec(i.pathname)?.[1])
      .filter((s): s is string => isValidSlug(s))
    const profiles = await Promise.all(slugs.map((s) => readProfile(s).catch(() => null)))
    return profiles.filter((p): p is BirthdayProfile => p !== null)
  }

  async function route(request: Request): Promise<Response> {
    const url = new URL(request.url)
    // On Vercel, /api/* is rewritten to /api?__path=* (see vercel.json).
    const rewritten = url.searchParams.get('__path')
    const pathname = rewritten !== null && /^\/api\/?$/.test(url.pathname) ? `/api/${rewritten}` : url.pathname
    const parts = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
    const method = request.method.toUpperCase()

    // Mutations must come from this site (SameSite cookies already block most CSRF).
    if (method !== 'GET' && method !== 'HEAD') {
      const origin = request.headers.get('origin')
      if (origin && new URL(origin).host !== url.host) return error(403, 'Cross-site request')
    }

    if (parts[0] === 'session' && method === 'GET') {
      return json({ authenticated: isAdmin(request), configured, storage: storage.mode })
    }

    if (parts[0] === 'login' && method === 'POST') {
      if (!configured) return error(503, 'ADMIN_PASSWORD and SESSION_SECRET are not set')
      const body = (await readBody(request)) as { password?: unknown }
      const password = typeof body.password === 'string' ? body.password : ''
      if (!passwordMatches(password, env.adminPassword!)) {
        // Slow down guessing.
        await new Promise((r) => setTimeout(r, 700))
        return error(401, 'Wrong password')
      }
      return json(
        { authenticated: true },
        { headers: { 'Set-Cookie': sessionCookie(createSessionToken(env.sessionSecret!), env.secureCookies) } },
      )
    }

    if (parts[0] === 'logout' && method === 'POST') {
      return json({ authenticated: false }, { headers: { 'Set-Cookie': clearSessionCookie(env.secureCookies) } })
    }

    if (parts[0] === 'p' && parts.length === 2 && method === 'GET') {
      const slug = parts[1]
      if (!isValidSlug(slug)) return error(404, 'Not found')
      const preview = url.searchParams.has('preview') && isAdmin(request)
      const profile = await readProfile(slug)
      if (!profile || (!profile.published && !preview)) return error(404, 'Not found')
      return json(profile, {
        headers: preview
          ? { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' }
          : {
              // Browsers always revalidate, so edits show up on the next visit;
              // only Vercel's CDN keeps a short-lived copy.
              'Cache-Control': 'public, max-age=0, must-revalidate',
              'Vercel-CDN-Cache-Control': 'max-age=60, stale-while-revalidate=600',
              'X-Robots-Tag': 'noindex',
            },
      })
    }

    // Everything below needs the admin session.
    if (!isAdmin(request)) return error(401, 'Sign in required')

    if (parts[0] === 'profiles' && parts.length === 1) {
      if (method === 'GET') {
        const profiles = await listProfiles()
        const summaries: ProfileSummary[] = profiles
          .map((p) => ({
            slug: p.slug,
            name: p.recipient.name,
            themeId: p.themeId,
            lang: p.lang,
            published: p.published,
            updatedAt: p.updatedAt,
            portrait: p.recipient.portrait,
            photos: p.gallery.photos.length,
            voices: p.voice.messages.length,
          }))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        return json(summaries, { headers: { 'Cache-Control': 'no-store' } })
      }
      if (method === 'POST') {
        const body = (await readBody(request)) as { name?: unknown; lang?: unknown; copyFrom?: unknown }
        const name = typeof body.name === 'string' ? body.name.slice(0, 120) : ''
        const slug = makeSlug(name, randomToken(8))
        const source = isValidSlug(body.copyFrom) ? await readProfile(body.copyFrom) : null
        const base = source ?? { lang: body.lang === 'en' ? 'en' : 'vi' }
        const profile = normalizeProfile(
          { ...base, published: false, recipient: { ...(source?.recipient ?? {}), name }, updatedAt: new Date().toISOString() },
          slug,
        )
        await storage.writeJson(profilePath(slug), profile)
        return json(profile, { status: 201 })
      }
    }

    if (parts[0] === 'profiles' && parts.length === 2) {
      const slug = parts[1]
      if (!isValidSlug(slug)) return error(404, 'Not found')
      const existing = await readProfile(slug)
      if (!existing) return error(404, 'Not found')

      if (method === 'GET') return json(existing, { headers: { 'Cache-Control': 'no-store' } })
      if (method === 'PUT') {
        const profile = normalizeProfile({ ...((await readBody(request)) as object), updatedAt: new Date().toISOString() }, slug)
        await storage.writeJson(profilePath(slug), profile)
        return json(profile)
      }
      if (method === 'DELETE') {
        await storage.delete([profilePath(slug)])
        // Keep media that another page still uses (e.g. a shared group song).
        const others = JSON.stringify(await listProfiles())
        const assets = await storage.list(assetPrefix(slug))
        await storage.delete(assets.filter((a) => !others.includes(a.url)).map((a) => a.pathname))
        return json({ deleted: slug })
      }
    }

    if (parts[0] === 'upload' && method === 'POST') {
      const slug = url.searchParams.get('slug') ?? ''
      if (!isValidSlug(slug) || !(await readProfile(slug))) return error(404, 'Unknown page')
      return storage.handleUpload(request, slug)
    }

    return error(404, 'Not found')
  }

  return async function handle(request: Request): Promise<Response> {
    try {
      return await route(request)
    } catch (e) {
      if (e instanceof HttpError) return error(e.status, e.message)
      console.error('[api]', e)
      return error(500, 'Server error')
    }
  }
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}
