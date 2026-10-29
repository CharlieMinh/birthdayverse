import { useCallback, useEffect, useState } from 'react'
import { api, type Session } from './api'
import { Editor } from './Editor'
import { Login } from './Login'
import { ProfileList } from './ProfileList'

type View = { kind: 'list' } | { kind: 'edit'; slug: string }

function viewFromPath(): View {
  const m = /^\/studio\/([a-z0-9-]+)\/?$/.exec(window.location.pathname)
  return m ? { kind: 'edit', slug: m[1] } : { kind: 'list' }
}

/** Studio shell: session check, then the page list or the editor (URL-driven). */
export function StudioApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [failed, setFailed] = useState(false)
  const [view, setView] = useState<View>(viewFromPath)

  const refreshSession = useCallback(() => {
    api
      .session()
      .then((s) => {
        setSession(s)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [])

  useEffect(refreshSession, [refreshSession])

  useEffect(() => {
    const onPop = () => setView(viewFromPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (next: View) => {
    history.pushState(null, '', next.kind === 'edit' ? `/studio/${next.slug}` : '/studio')
    setView(next)
    window.scrollTo(0, 0)
  }

  if (failed) {
    return (
      <Centered>
        <p className="text-muted">Không kết nối được máy chủ.</p>
        <button type="button" className="mt-4 text-accent underline" onClick={refreshSession}>
          Thử lại
        </button>
      </Centered>
    )
  }
  if (!session) {
    return (
      <Centered>
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
      </Centered>
    )
  }
  if (!session.authenticated) return <Login configured={session.configured} onSignedIn={refreshSession} />

  const signOut = async () => {
    await api.logout().catch(() => undefined)
    refreshSession()
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      {session.storage === 'local' && (
        <div className="bg-accent/15 px-4 py-2 text-center text-xs text-accent">
          Chế độ thử trên máy: ảnh và âm thanh được lưu trong thư mục <code>.data</code>, chưa lên Internet.
        </div>
      )}
      {view.kind === 'list' ? (
        <ProfileList onOpen={(slug) => navigate({ kind: 'edit', slug })} onSignOut={signOut} />
      ) : (
        <Editor key={view.slug} slug={view.slug} storage={session.storage} onBack={() => navigate({ kind: 'list' })} />
      )}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-bg text-center text-ink">{children}</div>
}
