import { useEffect, useState } from 'react'
import App from './App'
import type { BirthdayConfig } from './config/types'
import { validateConfig } from './config/validate'
import { demoProfile } from './profile/demo'
import { isValidSlug, normalizeProfile, resolveProfile, type BirthdayProfile } from './profile/schema'
import { applyTheme } from './theme/applyTheme'
import { THEME_PRESETS } from './theme/presets'

type Route = { kind: 'profile'; slug: string; preview: boolean } | { kind: 'demo' } | { kind: 'home' }

function parseRoute(location: Location): Route {
  const path = location.pathname.replace(/\/+$/, '')
  const match = /^\/b\/([^/]+)$/.exec(path)
  if (match) {
    return { kind: 'profile', slug: decodeURIComponent(match[1]), preview: new URLSearchParams(location.search).has('preview') }
  }
  if (path === '/demo') return { kind: 'demo' }
  return { kind: 'home' }
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; config: BirthdayConfig; draft?: boolean }
  | { status: 'missing' }
  | { status: 'error' }

async function fetchProfile(slug: string, preview: boolean): Promise<BirthdayProfile | null> {
  const res = await fetch(`/api/p/${encodeURIComponent(slug)}${preview ? '?preview=1' : ''}`, {
    credentials: 'same-origin',
    cache: 'no-cache',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return normalizeProfile(await res.json(), slug)
}

function prepare(profile: BirthdayProfile): BirthdayConfig {
  const config = resolveProfile(profile)
  applyTheme(config.theme)
  document.title = config.meta.title
  document.documentElement.lang = config.meta.lang
  if (import.meta.env.DEV) {
    for (const problem of validateConfig(config)) console.warn(`[config] ${problem}`)
  }
  return config
}

/** Picks the page from the URL, loads its profile, then hands over to the experience. */
export function Boot() {
  const [route] = useState(() => parseRoute(window.location))
  const [state, setState] = useState<LoadState>(() =>
    route.kind === 'demo' ? { status: 'ready', config: prepare(demoProfile) } : { status: 'loading' },
  )

  useEffect(() => {
    if (route.kind !== 'profile') return
    if (!isValidSlug(route.slug)) {
      setState({ status: 'missing' })
      return
    }
    let cancelled = false
    fetchProfile(route.slug, route.preview)
      .then((profile) => {
        if (cancelled) return
        setState(profile ? { status: 'ready', config: prepare(profile), draft: !profile.published } : { status: 'missing' })
      })
      .catch((err) => {
        console.error('[boot] could not load profile', err)
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [route])

  useEffect(() => {
    if (state.status !== 'ready') applyTheme(THEME_PRESETS.starry)
  }, [state.status])

  if (route.kind === 'home') {
    return (
      <Notice
        title="Một bất ngờ sinh nhật"
        body="Hãy mở bằng đường link riêng được gửi cho bạn."
        links={import.meta.env.DEV ? [['/demo', 'Xem bản mẫu'], ['/studio', 'Mở Studio']] : []}
      />
    )
  }
  if (state.status === 'ready') {
    return (
      <>
        <App config={state.config} />
        {state.draft && (
          <p className="pointer-events-none fixed left-3 top-3 z-50 rounded-full bg-amber-300/90 px-3 py-1 font-body text-xs font-semibold text-black">
            Bản nháp: chỉ bạn xem được
          </p>
        )}
      </>
    )
  }
  if (state.status === 'missing') {
    return <Notice title="Không tìm thấy lời chúc" body="Đường link này không đúng, đã bị gỡ hoặc chưa được xuất bản. Hãy hỏi lại người gửi nhé." />
  }
  if (state.status === 'error') {
    return (
      <Notice
        title="Chưa tải được"
        body="Có lỗi kết nối. Hãy kiểm tra mạng rồi thử lại."
        action={{ label: 'Thử lại', onClick: () => window.location.reload() }}
      />
    )
  }
  return (
    <div className="fixed inset-0 grid place-items-center bg-bg" role="status" aria-label="Đang tải">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
    </div>
  )
}

function Notice(props: {
  title: string
  body: string
  links?: Array<[string, string]>
  action?: { label: string; onClick: () => void }
}) {
  return (
    <main className="fixed inset-0 grid place-items-center bg-bg px-6 text-center text-ink">
      <div>
        <p className="font-display text-4xl font-light text-accent sm:text-5xl">{props.title}</p>
        <p className="mx-auto mt-4 max-w-sm font-body text-sm leading-relaxed text-muted">{props.body}</p>
        {props.links && props.links.length > 0 && (
          <div className="mt-8 flex justify-center gap-3">
            {props.links.map(([href, label]) => (
              <a key={href} href={href} className="rounded-full border border-ink/20 px-5 py-2.5 font-body text-sm text-ink hover:border-accent hover:text-accent">
                {label}
              </a>
            ))}
          </div>
        )}
        {props.action && (
          <button
            type="button"
            onClick={props.action.onClick}
            className="mt-8 rounded-full border border-ink/20 px-6 py-3 font-body text-sm text-ink hover:border-accent"
          >
            {props.action.label}
          </button>
        )}
      </div>
    </main>
  )
}
