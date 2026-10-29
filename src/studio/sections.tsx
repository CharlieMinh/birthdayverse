import { useEffect, useState } from 'react'
import type { Caption, CueName, SceneId, VoiceMessage } from '../config/types'
import { autoCaptions } from '../lib/captions'
import type { BirthdayProfile } from '../profile/schema'
import { randomToken } from '../profile/slug'
import { THEME_IDS, THEME_LABELS, THEME_PRESETS } from '../theme/presets'
import type { Uploader } from './Editor'
import { Button, DropZone, IconButton, Section, Select, Slider, TextArea, TextInput, Toggle, cx } from './ui'
import { UploadError, prepareAudio, preparePhoto } from './upload'

export interface SectionProps {
  profile: BirthdayProfile
  edit: (fn: (draft: BirthdayProfile) => void) => void
  upload: Uploader
  setNotice: (message: string) => void
}

const AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.aac,.wav,.ogg'
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

function move<T>(list: T[], from: number, to: number): void {
  if (to < 0 || to >= list.length) return
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
}

/** Seconds of an uploaded audio URL, read from its metadata. */
function useAudioDuration(src: string | undefined): number | null {
  const [state, setState] = useState<{ src?: string; duration: number | null }>({ duration: null })
  useEffect(() => {
    if (!src) return
    const el = new Audio()
    el.preload = 'metadata'
    el.onloadedmetadata = () => setState({ src, duration: Number.isFinite(el.duration) ? el.duration : null })
    el.src = src
    return () => {
      el.onloadedmetadata = null
      el.removeAttribute('src')
    }
  }, [src])
  return state.src === src ? state.duration : null
}

const formatSeconds = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} phút ${Math.round(s % 60)} giây` : `${Math.round(s)} giây`)

// ── Người nhận ─────────────────────────────────────────────────────────────

export function RecipientSection({ profile, edit, upload, setNotice }: SectionProps) {
  const [busy, setBusy] = useState(false)
  const { recipient } = profile

  const onPortrait = async (files: File[]) => {
    setBusy(true)
    try {
      const url = await upload(await preparePhoto(files[0], 'portrait'), 'portrait')
      if (url) edit((d) => void (d.recipient.portrait = url))
    } catch (err) {
      setNotice(err instanceof UploadError ? err.message : 'Không xử lý được ảnh.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section id="recipient" title="Người nhận" hint="Tên và ảnh của người sinh nhật.">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Tên đầy đủ" value={recipient.name} onChange={(v) => edit((d) => void (d.recipient.name = v))} placeholder="Nguyễn Văn Minh" maxLength={120} />
        <TextInput
          label="Tên gọi thân mật"
          value={recipient.shortName ?? ''}
          onChange={(v) => edit((d) => void (d.recipient.shortName = v || undefined))}
          placeholder="Minh"
          hint="Dùng trên phong bì và tiêu đề trang."
          maxLength={60}
        />
        <TextInput
          label="Tuổi mới (không bắt buộc)"
          type="number"
          value={recipient.age === undefined ? '' : String(recipient.age)}
          onChange={(v) => edit((d) => void (d.recipient.age = v === '' ? undefined : Math.max(0, Math.min(150, Math.round(Number(v)) || 0))))}
          hint="Hiện mờ phía sau lời chúc cuối."
        />
        <TextInput label="Người gửi" value={profile.sender.name} onChange={(v) => edit((d) => void (d.sender.name = v))} placeholder="Cả nhóm" maxLength={120} />
        <Select
          label="Ngôn ngữ của nút và chữ mặc định"
          value={profile.lang}
          options={[
            { value: 'vi', label: 'Tiếng Việt' },
            { value: 'en', label: 'English' },
          ]}
          onChange={(v) => edit((d) => void (d.lang = v))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-ink/15 bg-bg/60 text-3xl text-muted">
          {recipient.portrait ? <img src={recipient.portrait} alt="Ảnh chân dung" className="h-full w-full object-cover" /> : '🙂'}
        </span>
        <div className="flex-1">
          <DropZone accept={IMAGE_ACCEPT} label={recipient.portrait ? 'Đổi ảnh chân dung' : 'Chọn ảnh chân dung'} hint="Hiện trên con dấu phong bì và ở màn chúc mừng cuối." busy={busy} onFiles={onPortrait} />
          {recipient.portrait && (
            <Button variant="ghost" className="mt-2" onClick={() => edit((d) => void (d.recipient.portrait = undefined))}>
              Bỏ ảnh chân dung
            </Button>
          )}
        </div>
      </div>
    </Section>
  )
}

// ── Phong cách ─────────────────────────────────────────────────────────────

export function ThemeSection({ profile, edit }: SectionProps) {
  return (
    <Section id="theme" title="Phong cách" hint="Đổi màu, nền, kiểu chữ và hiệu ứng của cả trang.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {THEME_IDS.map((id) => {
          const theme = THEME_PRESETS[id]
          const selected = profile.themeId === id
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => edit((d) => void (d.themeId = id))}
              className={cx(
                'overflow-hidden rounded-2xl border-2 text-left transition',
                selected ? 'border-accent' : 'border-transparent hover:border-ink/30',
              )}
              style={{ backgroundColor: theme.colors.bg, backgroundImage: theme.backdrop }}
            >
              <div className="p-4">
                <p className="text-2xl leading-tight" style={{ fontFamily: theme.fonts.display, color: theme.colors.accent }}>
                  Chúc mừng sinh nhật
                </p>
                <div className="mt-3 flex gap-1.5">
                  {[theme.colors.accent, theme.colors.rose, theme.colors.glow, theme.colors.env1].map((c) => (
                    <span key={c} className="h-4 w-4 rounded-full ring-1 ring-white/20" style={{ background: c }} />
                  ))}
                </div>
                <p className="mt-3 text-sm font-semibold" style={{ color: theme.colors.text, fontFamily: theme.fonts.body }}>
                  {THEME_LABELS[id].vi} {selected && '✓'}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

// ── Lời mời ────────────────────────────────────────────────────────────────

export function InvitationSection({ profile, edit }: SectionProps) {
  const inv = profile.invitation
  return (
    <Section id="invitation" title="Lời mời" hint="Màn phong bì đầu tiên.">
      <TextInput label="Dòng nhỏ phía trên" value={inv.eyebrow} onChange={(v) => edit((d) => void (d.invitation.eyebrow = v))} />
      <TextInput label="Tiêu đề" value={inv.title} onChange={(v) => edit((d) => void (d.invitation.title = v))} />
      <TextArea label="Lá thư trong phong bì" value={inv.letter} rows={2} onChange={(v) => edit((d) => void (d.invitation.letter = v))} />
      <TextInput label="Gợi ý chạm" value={inv.hint} onChange={(v) => edit((d) => void (d.invitation.hint = v))} />
    </Section>
  )
}

// ── Album ảnh ──────────────────────────────────────────────────────────────

const FOCUS_OPTIONS = [
  { value: '50% 50%', label: 'Giữa ảnh' },
  { value: '50% 20%', label: 'Phía trên (giữ mặt)' },
  { value: '50% 80%', label: 'Phía dưới' },
]

export function GallerySection({ profile, edit, upload, setNotice }: SectionProps) {
  const [progress, setProgress] = useState<string>('')
  const photos = profile.gallery.photos

  const onFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name))
    for (const [i, file] of images.entries()) {
      setProgress(`Đang xử lý ảnh ${i + 1}/${images.length}…`)
      try {
        const url = await upload(await preparePhoto(file, 'photo'), 'photo')
        if (url) {
          edit((d) => {
            d.gallery.photos.push({ src: url, alt: `${d.recipient.name || 'Kỷ niệm'} ${d.gallery.photos.length + 1}` })
          })
        }
      } catch (err) {
        setNotice(err instanceof UploadError ? err.message : `Không xử lý được "${file.name}".`)
      }
    }
    setProgress('')
  }

  return (
    <Section
      id="gallery"
      title="Album ảnh"
      hint={`Ảnh được tự thu nhỏ trước khi tải lên. ${photos.length} ảnh · khoảng ${formatSeconds(photos.length * profile.timings.photoSeconds)}. Không có ảnh thì cảnh này được bỏ qua.`}
    >
      <TextInput label="Tiêu đề album" value={profile.gallery.title} onChange={(v) => edit((d) => void (d.gallery.title = v))} />
      <Slider
        label="Thời gian mỗi ảnh"
        value={profile.timings.photoSeconds}
        min={2}
        max={15}
        step={0.5}
        format={(v) => `${v} giây`}
        onChange={(v) => edit((d) => void (d.timings.photoSeconds = v))}
      />
      <DropZone accept={IMAGE_ACCEPT} multiple label="+ Thêm ảnh" hint="Chọn nhiều ảnh cùng lúc hoặc kéo thả vào đây." busy={Boolean(progress)} onFiles={onFiles} />
      {progress && <p className="text-sm text-accent">{progress}</p>}

      <ol className="space-y-3">
        {photos.map((photo, i) => (
          <li key={photo.src} className="flex gap-3 rounded-xl border border-ink/10 bg-bg/40 p-3">
            <img src={photo.src} alt="" className="h-24 w-20 shrink-0 rounded-lg object-cover" style={{ objectPosition: photo.focus ?? '50% 50%' }} />
            <div className="grid flex-1 gap-2">
              <input
                value={photo.caption ?? ''}
                onChange={(e) => edit((d) => void (d.gallery.photos[i].caption = e.target.value || undefined))}
                placeholder="Chú thích, ví dụ: Chuyến đi Đà Lạt"
                aria-label={`Chú thích ảnh ${i + 1}`}
                maxLength={400}
                className="rounded-lg border border-ink/15 bg-bg/70 px-2.5 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none"
              />
              <input
                value={photo.detail ?? ''}
                onChange={(e) => edit((d) => void (d.gallery.photos[i].detail = e.target.value || undefined))}
                placeholder="Dòng phụ: ngày, nơi chốn"
                aria-label={`Dòng phụ ảnh ${i + 1}`}
                maxLength={400}
                className="rounded-lg border border-ink/15 bg-bg/70 px-2.5 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none"
              />
              <select
                value={photo.focus ?? '50% 50%'}
                onChange={(e) => edit((d) => void (d.gallery.photos[i].focus = e.target.value))}
                aria-label={`Vùng giữ lại khi cắt ảnh ${i + 1}`}
                className="rounded-lg border border-ink/15 bg-bg/70 px-2 py-1.5 text-xs text-muted"
              >
                {FOCUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <IconButton label="Lên" disabled={i === 0} onClick={() => edit((d) => move(d.gallery.photos, i, i - 1))}>
                ↑
              </IconButton>
              <IconButton label="Xuống" disabled={i === photos.length - 1} onClick={() => edit((d) => move(d.gallery.photos, i, i + 1))}>
                ↓
              </IconButton>
              <IconButton label="Xoá ảnh" onClick={() => edit((d) => void d.gallery.photos.splice(i, 1))}>
                ✕
              </IconButton>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  )
}

// ── Lời chúc voice ─────────────────────────────────────────────────────────

export function VoiceSection({ profile, edit, upload, setNotice }: SectionProps) {
  const messages = profile.voice.messages
  return (
    <Section
      id="voice"
      title="Lời chúc"
      hint="Mỗi người một đoạn voice, phát lần lượt kèm phụ đề. Không có voice thì phụ đề hiện như một lá thư. Không có lời chúc nào thì cảnh này được bỏ qua."
    >
      <TextInput label="Dòng tiêu đề" value={profile.voice.eyebrow} onChange={(v) => edit((d) => void (d.voice.eyebrow = v))} />
      {messages.map((m, i) => (
        <VoiceCard key={i} index={i} count={messages.length} message={m} edit={edit} upload={upload} setNotice={setNotice} />
      ))}
      <Button onClick={() => edit((d) => void d.voice.messages.push({ from: '', captions: [] }))}>+ Thêm lời chúc</Button>
    </Section>
  )
}

function VoiceCard(props: {
  index: number
  count: number
  message: VoiceMessage
  edit: SectionProps['edit']
  upload: Uploader
  setNotice: (m: string) => void
}) {
  const { index: i, message, edit } = props
  const [busy, setBusy] = useState(false)
  const [transcript, setTranscript] = useState(() => message.captions.map((c) => c.text).join(' '))
  const duration = useAudioDuration(message.src)

  const setMessage = (fn: (m: VoiceMessage) => void) => edit((d) => fn(d.voice.messages[i]))
  const setCaptions = (captions: Caption[]) => setMessage((m) => void (m.captions = captions))

  const onAudio = async (files: File[]) => {
    setBusy(true)
    try {
      const url = await props.upload(prepareAudio(files[0]), 'voice')
      if (url) setMessage((m) => void (m.src = url))
    } catch (err) {
      props.setNotice(err instanceof UploadError ? err.message : 'Không tải được file âm thanh.')
    } finally {
      setBusy(false)
    }
  }

  const generate = () => {
    const words = transcript.trim().split(/\s+/).filter(Boolean).length
    const length = duration ?? Math.max(3, words / 2.6)
    setCaptions(autoCaptions(transcript, length))
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-bg/40 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <TextInput label={`Lời chúc ${i + 1} — từ`} value={message.from} onChange={(v) => setMessage((m) => void (m.from = v))} placeholder="Tên người gửi" maxLength={120} />
        </div>
        <div className="flex gap-1 pt-6">
          <IconButton label="Lên" disabled={i === 0} onClick={() => edit((d) => move(d.voice.messages, i, i - 1))}>
            ↑
          </IconButton>
          <IconButton label="Xuống" disabled={i === props.count - 1} onClick={() => edit((d) => move(d.voice.messages, i, i + 1))}>
            ↓
          </IconButton>
          <IconButton label="Xoá lời chúc" onClick={() => edit((d) => void d.voice.messages.splice(i, 1))}>
            ✕
          </IconButton>
        </div>
      </div>

      <div className="mt-3">
        {message.src ? (
          <div className="flex flex-wrap items-center gap-2">
            <audio controls src={message.src} className="h-10 max-w-full flex-1" preload="metadata" />
            <Button variant="ghost" onClick={() => setMessage((m) => void (m.src = undefined))}>
              Bỏ voice
            </Button>
          </div>
        ) : (
          <DropZone accept={AUDIO_ACCEPT} label="Chọn file voice" hint="MP3, M4A (ghi âm điện thoại), WAV. Tối đa 25 MB." busy={busy} onFiles={onAudio} />
        )}
      </div>

      <div className="mt-4">
        <TextArea
          label="Nội dung lời chúc (để làm phụ đề)"
          value={transcript}
          rows={3}
          onChange={setTranscript}
          placeholder="Gõ lại những gì nói trong voice, mỗi câu kết thúc bằng dấu chấm."
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button onClick={generate} disabled={!transcript.trim()}>
            Tạo phụ đề tự động
          </Button>
          <span className="text-xs text-muted">
            {duration ? `Voice dài ${formatSeconds(duration)}; phụ đề được chia theo độ dài câu.` : 'Chưa có voice: thời gian ước lượng theo số chữ.'}
          </span>
        </div>
      </div>

      {message.captions.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Phụ đề (giây bắt đầu – kết thúc)</p>
          {message.captions.map((c, ci) => (
            <div key={ci} className="flex items-center gap-2">
              {(['start', 'end'] as const).map((field) => (
                <input
                  key={field}
                  type="number"
                  step={0.1}
                  min={0}
                  value={c[field]}
                  aria-label={field === 'start' ? 'Bắt đầu' : 'Kết thúc'}
                  onChange={(e) => setMessage((m) => void (m.captions[ci][field] = Math.max(0, Number(e.target.value) || 0)))}
                  className="w-16 rounded-lg border border-ink/15 bg-bg/70 px-1.5 py-1.5 text-xs text-ink"
                />
              ))}
              <input
                value={c.text}
                aria-label={`Phụ đề ${ci + 1}`}
                onChange={(e) => setMessage((m) => void (m.captions[ci].text = e.target.value))}
                className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-bg/70 px-2 py-1.5 text-sm text-ink"
              />
              <IconButton label="Xoá phụ đề" onClick={() => setMessage((m) => void m.captions.splice(ci, 1))}>
                ✕
              </IconButton>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Nhạc & âm thanh ────────────────────────────────────────────────────────

const SCENE_LABELS: Array<[SceneId, string]> = [
  ['invitation', 'Khi mở phong bì'],
  ['gallery', 'Album ảnh'],
  ['voice', 'Lời chúc'],
  ['cake', 'Thổi nến'],
  ['finale', 'Pháo hoa & lời chúc cuối'],
]

const CUE_LABELS: Array<[CueName, string, string]> = [
  ['open', 'Khi mở phong bì', 'Ví dụ: tiếng "Surprise!" của cả nhóm.'],
  ['blow', 'Khi thổi nến', 'Ví dụ: cả nhóm hát Happy Birthday.'],
  ['finale', 'Khi bắn pháo hoa', 'Ví dụ: tiếng vỗ tay, hò reo.'],
]

const KEEP = ''
const SILENCE = '__silence'

export function MusicSection({ profile, edit, upload, setNotice }: SectionProps) {
  const [busy, setBusy] = useState('')
  const { audio } = profile

  const onTracks = async (files: File[]) => {
    for (const file of files) {
      setBusy('tracks')
      try {
        const url = await upload(prepareAudio(file), 'music')
        if (url) {
          edit((d) =>
            void d.audio.tracks.push({
              id: `t-${randomToken(6)}`,
              src: url,
              name: file.name.replace(/\.[^.]+$/, '').slice(0, 120),
              volume: 0.6,
            }),
          )
        }
      } catch (err) {
        setNotice(err instanceof UploadError ? err.message : `Không tải được "${file.name}".`)
      }
    }
    setBusy('')
  }

  const onCue = async (name: CueName, files: File[]) => {
    setBusy(name)
    try {
      const url = await upload(prepareAudio(files[0]), 'sound')
      if (url) edit((d) => void (d.audio.cues[name] = { src: url, volume: 1, duck: true }))
    } catch (err) {
      setNotice(err instanceof UploadError ? err.message : 'Không tải được file âm thanh.')
    } finally {
      setBusy('')
    }
  }

  const sceneValue = (scene: SceneId) => {
    const v = audio.sceneMusic[scene]
    return v === null ? SILENCE : v ?? KEEP
  }

  return (
    <Section id="music" title="Nhạc & âm thanh" hint="Tải nhạc lên, rồi chọn bài cho từng cảnh. Nhạc tự nhỏ lại khi có voice.">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Nhạc nền</p>
        {audio.tracks.map((t, i) => (
          <div key={t.id} className="rounded-xl border border-ink/10 bg-bg/40 p-3">
            <div className="flex items-center gap-2">
              <input
                value={t.name ?? ''}
                onChange={(e) => edit((d) => void (d.audio.tracks[i].name = e.target.value))}
                aria-label="Tên bài"
                className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-bg/70 px-2.5 py-2 text-sm text-ink"
              />
              <IconButton
                label="Xoá bài"
                onClick={() =>
                  edit((d) => {
                    d.audio.tracks.splice(i, 1)
                    for (const [scene, id] of Object.entries(d.audio.sceneMusic)) {
                      if (id === t.id) delete d.audio.sceneMusic[scene as SceneId]
                    }
                  })
                }
              >
                ✕
              </IconButton>
            </div>
            <audio controls src={t.src} preload="metadata" className="mt-2 h-10 w-full" />
            <Slider label="Âm lượng" value={Math.round(t.volume * 100)} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => edit((d) => void (d.audio.tracks[i].volume = v / 100))} />
          </div>
        ))}
        <DropZone accept={AUDIO_ACCEPT} multiple label="+ Thêm bài nhạc" hint="MP3 128 kbps là đủ hay và nhẹ. Tối đa 25 MB mỗi bài." busy={busy === 'tracks'} onFiles={onTracks} />
      </div>

      {audio.tracks.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Nhạc theo cảnh</p>
          {SCENE_LABELS.map(([scene, label]) => (
            <Select
              key={scene}
              label={label}
              value={sceneValue(scene)}
              options={[
                { value: KEEP, label: scene === 'invitation' ? `Mặc định (bài đầu tiên)` : 'Giữ bài đang phát' },
                { value: SILENCE, label: 'Im lặng' },
                ...audio.tracks.map((t) => ({ value: t.id, label: t.name || t.id })),
              ]}
              onChange={(v) =>
                edit((d) => {
                  if (v === KEEP) delete d.audio.sceneMusic[scene]
                  else d.audio.sceneMusic[scene] = v === SILENCE ? null : v
                })
              }
            />
          ))}
        </div>
      ) : (
        <Select
          label="Khi chưa có nhạc"
          value={audio.fallback}
          options={[
            { value: 'musicbox', label: 'Phát hộp nhạc “Happy Birthday” có sẵn' },
            { value: 'none', label: 'Im lặng' },
          ]}
          onChange={(v) => edit((d) => void (d.audio.fallback = v))}
        />
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Âm thanh tuỳ chọn</p>
        {CUE_LABELS.map(([name, label, hint]) => {
          const cue = audio.cues[name]
          return (
            <div key={name} className="rounded-xl border border-ink/10 bg-bg/40 p-3">
              <p className="text-sm font-semibold text-ink">{label}</p>
              {cue ? (
                <div className="mt-2 space-y-2">
                  <audio controls src={cue.src} preload="metadata" className="h-10 w-full" />
                  <Slider label="Âm lượng" value={Math.round(cue.volume * 100)} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => edit((d) => void (d.audio.cues[name]!.volume = v / 100))} />
                  <Toggle label="Cho nhạc nền nhỏ lại khi phát" checked={cue.duck} onChange={(v) => edit((d) => void (d.audio.cues[name]!.duck = v))} />
                  <Button variant="ghost" onClick={() => edit((d) => void delete d.audio.cues[name])}>
                    Bỏ âm thanh này
                  </Button>
                </div>
              ) : (
                <div className="mt-2">
                  <DropZone accept={AUDIO_ACCEPT} label="Chọn file" hint={hint} busy={busy === name} onFiles={(f) => onCue(name, f)} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Slider
        label="Âm lượng nhạc nền khi có voice"
        value={Math.round(audio.ducking.level * 100)}
        min={0}
        max={60}
        step={5}
        format={(v) => `${v}%`}
        onChange={(v) => edit((d) => void (d.audio.ducking.level = v / 100))}
      />
    </Section>
  )
}

// ── Bánh kem ───────────────────────────────────────────────────────────────

export function CakeSection({ profile, edit }: SectionProps) {
  const { cake, recipient } = profile
  return (
    <Section id="cake" title="Bánh kem">
      <Slider label="Số nến" value={cake.candles} min={1} max={12} onChange={(v) => edit((d) => void (d.cake.candles = v))} />
      {recipient.age !== undefined && recipient.age >= 1 && recipient.age <= 12 && cake.candles !== recipient.age && (
        <Button variant="ghost" onClick={() => edit((d) => void (d.cake.candles = recipient.age!))}>
          Đặt số nến bằng tuổi ({recipient.age})
        </Button>
      )}
      <TextInput label="Tiêu đề" value={cake.title} onChange={(v) => edit((d) => void (d.cake.title = v))} />
      <TextInput label="Gợi ý chạm" value={cake.hint} onChange={(v) => edit((d) => void (d.cake.hint = v))} />
      <TextInput label="Câu sau khi thổi nến" value={cake.afterBlow} onChange={(v) => edit((d) => void (d.cake.afterBlow = v))} />
    </Section>
  )
}

// ── Kết thúc ───────────────────────────────────────────────────────────────

export function FinaleSection({ profile, edit }: SectionProps) {
  const f = profile.finale
  return (
    <Section id="finale" title="Lời chúc cuối" hint="Màn pháo hoa với tên người sinh nhật.">
      <TextInput label="Tiêu đề lớn" value={f.headline} onChange={(v) => edit((d) => void (d.finale.headline = v))} />
      <TextArea label="Lời nhắn" value={f.message} rows={3} onChange={(v) => edit((d) => void (d.finale.message = v))} />
      <TextInput label="Chữ ký" value={f.signature} onChange={(v) => edit((d) => void (d.finale.signature = v))} />
      <TextInput label="Nút xem lại" value={f.replayLabel} onChange={(v) => edit((d) => void (d.finale.replayLabel = v))} />
      <Slider
        label="Thời gian trước khi hiện nút xem lại"
        value={profile.timings.finale}
        min={8}
        max={60}
        format={(v) => `${v} giây`}
        onChange={(v) => edit((d) => void (d.timings.finale = v))}
      />
    </Section>
  )
}
