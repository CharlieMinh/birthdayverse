import { useState, type FormEvent } from 'react'
import { ApiError, api } from './api'
import { Button } from './ui'

export function Login({ configured, onSignedIn }: { configured: boolean; onSignedIn: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.login(password)
      onSignedIn()
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Sai mật khẩu.' : 'Không đăng nhập được, hãy thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-5 text-ink">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-ink/10 bg-surface/70 p-7 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">BirthdayVerse</p>
        <h1 className="mt-2 font-display text-4xl">Studio</h1>
        {configured ? (
          <>
            <label htmlFor="pw" className="mt-6 block text-xs font-semibold uppercase tracking-wider text-muted">
              Mật khẩu quản trị
            </label>
            <input
              id="pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-ink/15 bg-bg/70 px-3 py-2.5 text-ink focus:border-accent focus:outline-none"
              autoFocus
              required
            />
            {error && (
              <p role="alert" className="mt-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" className="mt-5 w-full" disabled={busy || !password}>
              {busy ? 'Đang kiểm tra…' : 'Đăng nhập'}
            </Button>
          </>
        ) : (
          <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
            <p>Studio chưa được cấu hình mật khẩu.</p>
            <p>
              Trong Vercel → Project → Settings → Environment Variables, thêm <code className="text-ink">ADMIN_PASSWORD</code> (mật khẩu bạn tự
              đặt) và <code className="text-ink">SESSION_SECRET</code> (một chuỗi ngẫu nhiên dài), rồi deploy lại.
            </p>
          </div>
        )}
      </form>
    </main>
  )
}
