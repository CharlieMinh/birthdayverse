import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useConfig, useUi } from '../config/ConfigContext'
import { LICENSE_URL, musicCredits } from '../audio/library'
import { safeFileName } from './zip'
import { detectPlatform, saveFile } from './save'

type Job =
  | { state: 'idle' }
  | { state: 'working'; label: string }
  | { state: 'ready'; file: File; preview?: string; saved?: boolean }
  | { state: 'error' }

/**
 * "Save keepsake" panel on the finale. Each item is prepared first, then
 * saved with a second tap, because phones only allow the share sheet to open
 * directly from a tap, not after a long async build.
 */
export function KeepsakeSheet({ onClose }: { onClose: () => void }) {
  const config = useConfig()
  const ui = useUi()
  const t = ui.keepsake
  const [card, setCard] = useState<Job>({ state: 'idle' })
  const [zip, setZip] = useState<Job>({ state: 'idle' })
  const cardBlob = useRef<Blob | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const platform = detectPlatform()
  const name = safeFileName(config.recipient.shortName || config.recipient.name, 'BirthdayVerse')
  const voices = config.voice.messages.filter((m) => m.src).length
  // CC BY 4.0 credit for built-in music, kept here rather than on the finale screen.
  const credits = musicCredits(config.audio.tracks.map((tr) => tr.src))

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [onClose])

  useEffect(
    () => () => {
      if (card.state === 'ready' && card.preview) URL.revokeObjectURL(card.preview)
    },
    [card],
  )

  const getCard = async (): Promise<Blob> => {
    if (cardBlob.current) return cardBlob.current
    const { renderKeepsakeCard } = await import('./card')
    cardBlob.current = await renderKeepsakeCard(config)
    return cardBlob.current
  }

  const prepareCard = async () => {
    setCard({ state: 'working', label: t.preparing })
    try {
      const blob = await getCard()
      const file = new File([blob], `${name} - ${config.finale.headline}.jpg`, { type: 'image/jpeg' })
      setCard({ state: 'ready', file, preview: URL.createObjectURL(blob) })
    } catch (error) {
      console.error('[keepsake] card failed', error)
      setCard({ state: 'error' })
    }
  }

  const prepareZip = async () => {
    setZip({ state: 'working', label: t.preparing })
    try {
      const blob = await getCard().catch(() => null)
      const { buildKeepsakeZip } = await import('./bundle')
      const bytes = await buildKeepsakeZip(config, blob, (done, total) => setZip({ state: 'working', label: t.progress(done, total) }))
      setZip({ state: 'ready', file: new File([bytes], `${name} - BirthdayVerse.zip`, { type: 'application/zip' }) })
    } catch (error) {
      console.error('[keepsake] zip failed', error)
      setZip({ state: 'error' })
    }
  }

  const save = async (job: Job, set: (j: Job) => void) => {
    if (job.state !== 'ready') return
    const result = await saveFile(job.file)
    if (result !== 'cancelled') set({ ...job, saved: true })
  }

  const item = (title: string, desc: string, job: Job, prepare: () => void, set: (j: Job) => void) => (
    <div className="rounded-2xl border border-ink/10 bg-bg/60 p-4 text-left">
      <p className="font-display text-2xl text-ink">{title}</p>
      <p className="mt-1 font-body text-sm leading-relaxed text-muted">{desc}</p>
      {job.state === 'ready' && job.preview && (
        <img src={job.preview} alt="" className="mx-auto mt-3 max-h-56 rounded-xl shadow-lg" />
      )}
      <div className="mt-3">
        {job.state === 'idle' && (
          <button type="button" onClick={prepare} className={buttonClass('soft')}>
            {t.prepare}
          </button>
        )}
        {job.state === 'working' && (
          <p className="flex items-center gap-3 font-body text-sm text-accent" role="status">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" aria-hidden="true" />
            {job.label}
          </p>
        )}
        {job.state === 'ready' && (
          <button type="button" onClick={() => void save(job, set)} className={buttonClass('primary')}>
            {job.saved ? `${t.saved} · ${t.again}` : t.save}
          </button>
        )}
        {job.state === 'error' && (
          <div role="alert">
            <p className="font-body text-sm text-rose">{t.failed}</p>
            <button type="button" onClick={prepare} className={`${buttonClass('soft')} mt-2`}>
              {t.retry}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keepsake-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom max-h-[92svh] w-full max-w-md overflow-y-auto rounded-3xl border border-ink/10 bg-surface p-5 text-center shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-left">
            <h2 id="keepsake-title" className="font-display text-3xl text-accent">
              {t.title}
            </h2>
            <p className="mt-1 font-body text-sm text-muted">{t.intro}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t.close} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/15 text-ink/80 hover:text-accent">
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {item(t.cardTitle, t.cardDesc, card, () => void prepareCard(), setCard)}
          {item(t.zipTitle, t.zipDesc(config.gallery.photos.length, voices), zip, () => void prepareZip(), setZip)}
        </div>
        <p className="mt-4 text-left font-body text-xs leading-relaxed text-muted">{t.hint[platform]}</p>
        {credits.length > 0 && (
          <p className="mt-3 text-left font-body text-[10px] leading-snug text-muted/70">
            {ui.musicCredit}: {credits.join(' · ')} —{' '}
            <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              CC BY 4.0
            </a>
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}

function buttonClass(kind: 'primary' | 'soft'): string {
  const base =
    'inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 font-body text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]'
  return kind === 'primary' ? `${base} bg-accent text-bg hover:brightness-110` : `${base} border border-accent/50 text-accent hover:bg-accent/10`
}
