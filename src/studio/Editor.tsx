import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BirthdayProfile } from '../profile/schema'
import { THEME_PRESETS } from '../theme/presets'
import { api, pageUrl } from './api'
import {
  CakeSection,
  FinaleSection,
  GallerySection,
  InvitationSection,
  MusicSection,
  RecipientSection,
  ThemeSection,
  VoiceSection,
  type SectionProps,
} from './sections'
import { Button, Toggle } from './ui'
import { UploadError, uploadFile, type UploadKind } from './upload'

const NAV = [
  ['recipient', 'Người nhận'],
  ['theme', 'Phong cách'],
  ['invitation', 'Lời mời'],
  ['gallery', 'Album ảnh'],
  ['voice', 'Lời chúc'],
  ['music', 'Nhạc & âm thanh'],
  ['cake', 'Bánh kem'],
  ['finale', 'Kết thúc'],
] as const

export type Uploader = (file: File, kind: UploadKind) => Promise<string | null>

/** Loads one page, keeps a local draft, and saves it explicitly (saves count against Blob quotas). */
export function Editor({ slug, storage, onBack }: { slug: string; storage: 'blob' | 'local'; onBack: () => void }) {
  const [profile, setProfile] = useState<BirthdayProfile | null>(null)
  const [savedJson, setSavedJson] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [loadError, setLoadError] = useState('')
  const [uploads, setUploads] = useState(0)
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api
      .get(slug)
      .then((p) => {
        setProfile(p)
        setSavedJson(JSON.stringify(p))
      })
      .catch(() => setLoadError('Không tải được trang này. Có thể nó đã bị xoá.'))
  }, [slug])

  // Theme fonts, so the theme picker can show each look's type.
  useEffect(() => {
    for (const theme of Object.values(THEME_PRESETS)) {
      if (document.querySelector(`link[href="${theme.fontsHref}"]`)) continue
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = theme.fontsHref
      document.head.appendChild(link)
    }
  }, [])

  const dirty = profile !== null && JSON.stringify(profile) !== savedJson

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const edit = useCallback((fn: (draft: BirthdayProfile) => void) => {
    setProfile((p) => {
      if (!p) return p
      const draft = structuredClone(p)
      fn(draft)
      return draft
    })
  }, [])

  const save = useCallback(async (): Promise<boolean> => {
    if (!profile) return false
    setStatus('saving')
    try {
      const saved = await api.save(profile)
      setProfile(saved)
      setSavedJson(JSON.stringify(saved))
      setStatus('idle')
      return true
    } catch {
      setStatus('error')
      return false
    }
  }, [profile])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  const upload: Uploader = useCallback(
    async (file, kind) => {
      setUploads((n) => n + 1)
      setNotice('')
      try {
        return await uploadFile(file, slug, kind, storage)
      } catch (err) {
        setNotice(err instanceof UploadError ? err.message : `Tải "${file.name}" lên thất bại. Hãy thử lại.`)
        return null
      } finally {
        setUploads((n) => n - 1)
      }
    },
    [slug, storage],
  )

  const sectionProps: SectionProps | null = useMemo(
    () => (profile ? { profile, edit, upload, setNotice } : null),
    [profile, edit, upload],
  )

  if (loadError) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center">
        <p className="text-muted">{loadError}</p>
        <Button className="mt-6" onClick={onBack}>
          ← Về danh sách
        </Button>
      </main>
    )
  }
  if (!profile || !sectionProps) return <p className="p-10 text-center text-muted">Đang tải…</p>

  const preview = async () => {
    // Open the tab inside the click so pop-up blockers allow it.
    const tab = window.open('about:blank', '_blank')
    if (dirty && !(await save())) {
      tab?.close()
      return
    }
    if (tab) tab.location.href = `/b/${profile.slug}?preview=1`
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl(profile.slug))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Sao chép link này:', pageUrl(profile.slug))
    }
  }

  const statusText =
    uploads > 0 ? 'Đang tải file lên…' : status === 'saving' ? 'Đang lưu…' : status === 'error' ? 'Lưu thất bại' : dirty ? 'Chưa lưu' : 'Đã lưu'

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Button variant="ghost" onClick={onBack} aria-label="Về danh sách">
            ←
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{profile.recipient.name || 'Chưa đặt tên'}</p>
            <p className={status === 'error' ? 'text-xs text-red-300' : 'text-xs text-muted'} aria-live="polite">
              {statusText}
            </p>
          </div>
          <Button onClick={preview} disabled={uploads > 0}>
            Xem thử
          </Button>
          <Button variant="primary" onClick={save} disabled={!dirty || status === 'saving' || uploads > 0}>
            Lưu
          </Button>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-3 sm:px-6">
          <Toggle
            label={profile.published ? 'Đã xuất bản — người có link xem được' : 'Bản nháp — chỉ bạn xem thử được'}
            checked={profile.published}
            onChange={(v) => edit((d) => void (d.published = v))}
          />
          <button type="button" onClick={copyLink} className="text-sm text-accent underline-offset-2 hover:underline">
            {copied ? 'Đã sao chép ✓' : `Sao chép link: /b/${profile.slug}`}
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:px-6" aria-label="Các mục">
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-ink/[0.06] hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
      </header>

      {notice && (
        <div role="alert" className="mx-auto mt-4 flex max-w-6xl items-start justify-between gap-4 px-4 sm:px-6">
          <p className="flex-1 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{notice}</p>
          <Button variant="ghost" onClick={() => setNotice('')} aria-label="Đóng thông báo">
            ✕
          </Button>
        </div>
      )}

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
        <RecipientSection {...sectionProps} />
        <ThemeSection {...sectionProps} />
        <InvitationSection {...sectionProps} />
        <GallerySection {...sectionProps} />
        <VoiceSection {...sectionProps} />
        <MusicSection {...sectionProps} />
        <CakeSection {...sectionProps} />
        <FinaleSection {...sectionProps} />
        <p className="pb-10 text-center text-xs text-muted">Nhớ bấm “Lưu” (hoặc Ctrl+S) sau khi chỉnh sửa. Thay đổi hiện lên link sau khoảng 1 phút.</p>
      </main>
    </div>
  )
}
