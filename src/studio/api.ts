import { normalizeProfile, type BirthdayProfile, type ProfileSummary } from '../profile/schema'

export type { ProfileSummary }

export interface Session {
  authenticated: boolean
  configured: boolean
  storage: 'blob' | 'local'
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, (body as { error?: string }).error ?? `HTTP ${res.status}`)
  return body as T
}

export const api = {
  session: () => request<Session>('/api/session'),
  login: (password: string) => request<{ authenticated: boolean }>('/api/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request('/api/logout', { method: 'POST' }),
  list: () => request<ProfileSummary[]>('/api/profiles'),
  create: (name: string, copyFrom?: string) =>
    request<BirthdayProfile>('/api/profiles', { method: 'POST', body: JSON.stringify({ name, copyFrom }) }).then((p) =>
      normalizeProfile(p, p.slug),
    ),
  get: (slug: string) => request<BirthdayProfile>(`/api/profiles/${slug}`).then((p) => normalizeProfile(p, slug)),
  save: (profile: BirthdayProfile) =>
    request<BirthdayProfile>(`/api/profiles/${profile.slug}`, { method: 'PUT', body: JSON.stringify(profile) }).then((p) =>
      normalizeProfile(p, profile.slug),
    ),
  remove: (slug: string) => request(`/api/profiles/${slug}`, { method: 'DELETE' }),
}

export const pageUrl = (slug: string) => `${window.location.origin}/b/${slug}`
