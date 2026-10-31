import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Toast, useDialog } from './Feedback'
import { GiftCover } from './GiftCover'
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
  const { ask, dialog } = useDialog()
  const [profile, setProfile] = useState<BirthdayProfile | null>(null)
  const [savedJson, setSavedJson] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [loadError, setLoadError] = useState('')
  const [uploads, setUploads] = useState(0)
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('recipient')
  const saving = useRef(false)

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

  const persist = useCallback(async (next: BirthdayProfile): Promise<boolean> => {
    if (saving.current) return false
    saving.current = true
    const submitted = JSON.stringify(next)
    setStatus('saving')
    try {
      const saved = await api.save(next)
      setProfile(current => JSON.stringify(current) === submitted ? saved : current)
      setSavedJson(JSON.stringify(saved))
      setStatus('idle')
      setNotice('Đã lưu thay đổi. Món quà của bạn đã được cập nhật.')
      return true
    } catch {
      setStatus('error')
      setNotice('Chưa lưu được thay đổi. Nội dung vẫn được giữ trên màn hình; hãy kiểm tra kết nối và thử lại.')
      return false
    } finally {
      saving.current = false
    }
  }, [])

  const save = useCallback(async (): Promise<boolean> => (profile ? persist(profile) : false), [profile, persist])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (uploads === 0) void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save, uploads])

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

  // What visitors actually get is the saved copy, not the draft on screen.
  const livePublished = savedJson ? (JSON.parse(savedJson) as BirthdayProfile).published : false

  /** Publishing is saved immediately (with any other pending edits), so the link works right away. */
  const setPublished = async (published: boolean): Promise<boolean> => {
    if (await ask({ title: published ? 'Sẵn sàng gửi món quà?' : 'Chuyển về bản nháp?', message: published ? 'Các thay đổi hiện tại sẽ được lưu và người có đường link có thể xem món quà.' : 'Người có đường link sẽ không xem được món quà sau khi trạng thái được cập nhật.', confirm: published ? 'Xuất bản món quà' : 'Chuyển về bản nháp' }) === null) return false
    const next = { ...profile, published }
    setProfile(next)
    const ok = await persist(next)
    if (ok) setNotice(published ? 'Đã xuất bản. Bạn có thể sao chép link và gửi món quà!' : 'Đã chuyển về bản nháp.')
    return ok
  }

  const copyLink = async () => {
    if (!livePublished) {
      setNotice('Hãy bật Xuất bản khi bạn sẵn sàng gửi món quà, sau đó sao chép link.')
      return
    }
    try {
      await navigator.clipboard.writeText(pageUrl(profile.slug))
      setCopied(true)
      setNotice('Đã sao chép đường link. Sẵn sàng gửi đến người đặc biệt!')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      void ask({ title: 'Sao chép đường link', message: 'Chọn đường link bên dưới và nhấn Ctrl+C hoặc ⌘C để sao chép.', input: pageUrl(profile.slug), readOnly: true })
    }
  }

  const statusText =
    uploads > 0 ? 'Đang tải file lên…' : status === 'saving' ? 'Đang lưu…' : status === 'error' ? 'Lưu thất bại' : dirty ? 'Chưa lưu' : 'Đã lưu'

  return (
    <div>
      {dialog}
      {notice && <Toast message={notice} onClose={() => setNotice('')} />}
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Button variant="ghost" disabled={uploads > 0 || status === 'saving'} onClick={async () => {
            if (!dirty || await ask({ title: 'Bạn còn thay đổi chưa lưu', message: 'Quay lại để lưu món quà, hoặc rời trang và bỏ những thay đổi vừa chỉnh sửa.', danger: true, confirm: 'Rời trang, bỏ thay đổi' }) !== null) onBack()
          }} aria-label="Về danh sách">
            ←
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{profile.recipient.name || 'Chưa đặt tên'}</p>
            <p className={status === 'error' ? 'text-xs text-red-300' : 'text-xs text-muted'} aria-live="polite">
              {statusText}
            </p>
          </div>
          <Button onClick={preview} disabled={uploads > 0 || status === 'saving'}>
            Xem thử
          </Button>
          <Button variant="primary" onClick={save} disabled={!dirty || status === 'saving' || uploads > 0}>
            Lưu
          </Button>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-3 sm:px-6">
          <Toggle
            label={livePublished ? 'Đã xuất bản — người có link xem được' : 'Xuất bản (đang là bản nháp)'}
            checked={livePublished}
            disabled={status === 'saving' || uploads > 0}
            onChange={(v) => void setPublished(v)}
          />
          <button type="button" onClick={copyLink} className="text-sm text-accent underline-offset-2 hover:underline">
            {copied ? 'Đã sao chép ✓' : `Sao chép link: /b/${profile.slug}`}
          </button>
        </div>
      </header>

      {!livePublished && (
        <div className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
          <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            Trang đang là <strong>bản nháp</strong>: chỉ bạn xem được qua nút “Xem thử”. Người khác mở link sẽ thấy “Không tìm thấy lời
            chúc”. Bật <strong>Xuất bản</strong> ở trên khi muốn gửi link.
          </p>
        </div>
      )}

      <div className="editor-layout">
        <nav className="editor-nav" aria-label="Các mục thiết kế">
          <p className="studio-kicker">THIẾT KẾ MÓN QUÀ</p>
          {NAV.map(([id, label], index) => <button key={id} aria-pressed={activeSection === id} aria-controls={`panel-${id}`} onClick={() => setActiveSection(id)}><span>{String(index + 1).padStart(2, '0')}</span>{label}</button>)}
        </nav>
      <main className="editor-content">
        <div id="panel-recipient" hidden={activeSection !== 'recipient'}><RecipientSection {...sectionProps} /></div>
        <div id="panel-theme" hidden={activeSection !== 'theme'}><ThemeSection {...sectionProps} /></div>
        <div id="panel-invitation" hidden={activeSection !== 'invitation'}><InvitationSection {...sectionProps} /></div>
        <div id="panel-gallery" hidden={activeSection !== 'gallery'}><GallerySection {...sectionProps} /></div>
        <div id="panel-voice" hidden={activeSection !== 'voice'}><VoiceSection {...sectionProps} /></div>
        <div id="panel-music" hidden={activeSection !== 'music'}><MusicSection {...sectionProps} active={activeSection === 'music'} /></div>
        <div id="panel-cake" hidden={activeSection !== 'cake'}><CakeSection {...sectionProps} /></div>
        <div id="panel-finale" hidden={activeSection !== 'finale'}><FinaleSection {...sectionProps} /></div>
        <p className="pb-10 text-center text-xs text-muted">Nhớ bấm “Lưu” (hoặc Ctrl+S) sau khi chỉnh sửa. Thay đổi hiện lên link sau khoảng 1 phút.</p>
      </main>
        <aside className="editor-summary"><p className="studio-kicker">MÓN QUÀ CỦA BẠN</p><GiftCover themeId={profile.themeId} name={profile.recipient.name} portrait={profile.recipient.portrait} /><div className="editor-summary-counts"><span>{profile.gallery.photos.length} tấm ảnh</span><span>{profile.voice.messages.length} lời chúc</span></div><p>Bìa minh họa theo phong cách bạn chọn. Bấm “Xem thử” để trải nghiệm toàn bộ animation và âm thanh.</p></aside>
      </div>
    </div>
  )
}
