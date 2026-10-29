import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Admin session for the Studio: one shared password (ADMIN_PASSWORD) and a
 * signed, HttpOnly cookie. No user database: the cookie is `<expiry>.<hmac>`.
 */

export const SESSION_COOKIE = 'bv_session'
const SESSION_DAYS = 30

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

/** Constant-time password check (hashing first makes lengths equal). */
export function passwordMatches(given: string, expected: string): boolean {
  if (!expected) return false
  return timingSafeEqual(sha256(given), sha256(expected))
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createSessionToken(secret: string, now = Date.now()): string {
  const expires = String(now + SESSION_DAYS * 24 * 3600 * 1000)
  return `${expires}.${sign(expires, secret)}`
}

export function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): boolean {
  if (!token || !secret) return false
  const [expires, mac] = token.split('.')
  if (!expires || !mac || !/^\d+$/.test(expires) || Number(expires) < now) return false
  const expected = Buffer.from(sign(expires, secret))
  const given = Buffer.from(mac)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return undefined
}

export function sessionCookie(token: string, secure: boolean): string {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${SESSION_DAYS * 24 * 3600}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

export function clearSessionCookie(secure: boolean): string {
  return [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0', secure ? 'Secure' : '']
    .filter(Boolean)
    .join('; ')
}
