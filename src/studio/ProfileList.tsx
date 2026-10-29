import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { THEME_LABELS, THEME_PRESETS } from '../theme/presets'
import { api, pageUrl, type ProfileSummary } from './api'
import { Button } from './ui'

const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

export function ProfileList({ onOpen, onSignOut }: { onOpen: (slug: string) => void; onSignOut: () => void }) {
  const [items, setItems] = useState<ProfileSummary[] | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')

  const load = useCallback(() => {
    api
      .list()
      .then(setItems)
      .catch(() => setError('Không tải được danh sách.'))
  }, [])
  useEffect(load, [load])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const profile = await api.create(name.trim())
      onOpen(profile.slug)
    } catch {
      setError('Không tạo được trang mới.')
      setBusy(false)
    }
  }

  const duplicate = async (item: ProfileSummary) => {
    const newName = window.prompt('Tên người nhận cho bản sao:', '')
    if (newName === null) return
    try {
      const profile = await api.create(newName.trim(), item.slug)
      onOpen(profile.slug)
    } catch {
      setError('Không nhân bản được.')
    }
  }

  const remove = async (item: ProfileSummary) => {
    if (!window.confirm(`Xoá trang của "${item.name || 'chưa đặt tên'}"? Link sẽ ngừng hoạt động và ảnh/âm thanh riêng của trang sẽ bị xoá.`)) return
    try {
      await api.remove(item.slug)
      load()
    } catch {
      setError('Không xoá được.')
    }
  }

  const copy = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(pageUrl(slug))
      setCopied(slug)
    } catch {
      window.prompt('Sao chép link này:', pageUrl(slug))
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">BirthdayVerse Studio</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Trang sinh nhật</h1>
        </div>
        <Button variant="ghost" onClick={onSignOut}>
          Đăng xuất
        </Button>
      </header>

      <form onSubmit={create} className="mt-8 flex flex-col gap-3 rounded-2xl border border-ink/10 bg-surface/60 p-4 sm:flex-row sm:items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="Tên người sinh nhật, ví dụ: Minh"
          aria-label="Tên người sinh nhật"
          className="min-h-11 flex-1 rounded-xl border border-ink/15 bg-bg/70 px-3 text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none"
        />
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Đang tạo…' : '+ Tạo trang mới'}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {items === null ? (
        <p className="mt-10 text-muted">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="mt-10 text-center text-muted">Chưa có trang nào. Nhập tên người sinh nhật ở trên để bắt đầu.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const theme = THEME_PRESETS[item.themeId]
            return (
              <li key={item.slug} className="flex flex-col rounded-2xl border border-ink/10 bg-surface/60 p-4">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full text-xl font-semibold"
                    style={{ background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.rose})`, color: theme.colors.bg }}
                  >
                    {item.portrait ? (
                      <img src={item.portrait} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (item.name || '?').charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{item.name || 'Chưa đặt tên'}</p>
                    <p className="text-xs text-muted">
                      {THEME_LABELS[item.themeId].vi} · {item.photos} ảnh · {item.voices} lời chúc
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className={item.published ? 'rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-300' : 'rounded-full bg-ink/10 px-2 py-0.5 text-muted'}>
                    {item.published ? 'Đã xuất bản' : 'Bản nháp'}
                  </span>
                  <span className="text-muted/70">{dateFormat.format(new Date(item.updatedAt))}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => onOpen(item.slug)}>
                    Sửa
                  </Button>
                  <Button onClick={() => copy(item.slug)}>{copied === item.slug ? 'Đã sao chép ✓' : 'Sao chép link'}</Button>
                  <Button onClick={() => duplicate(item)}>Nhân bản</Button>
                  <Button variant="danger" onClick={() => remove(item)}>
                    Xoá
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
