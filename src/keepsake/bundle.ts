import { musicCredits } from '../audio/library'
import type { BirthdayConfig } from '../config/types'
import { createZip, safeFileName, type ZipEntry } from './zip'

const EXT_BY_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
}

function extensionFor(src: string, type: string | null): string {
  const fromType = type ? EXT_BY_TYPE[type.split(';')[0].trim()] : undefined
  if (fromType) return fromType
  const m = /\.([a-z0-9]{2,4})(?:$|\?)/i.exec(src)
  return m ? m[1].toLowerCase() : 'bin'
}

async function fetchFile(src: string): Promise<{ data: Uint8Array; ext: string } | null> {
  try {
    const res = await fetch(src, { mode: 'cors' })
    if (!res.ok) return null
    return { data: new Uint8Array(await res.arrayBuffer()), ext: extensionFor(src, res.headers.get('content-type')) }
  } catch {
    return null
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Plain-text letter with every wish on the page, readable on any device. */
export function keepsakeLetter(config: BirthdayConfig, savedOn: Date, missing: string[]): string {
  const vi = config.meta.lang !== 'en'
  const { finale, recipient, voice, gallery } = config
  const lines = [`${finale.headline} ${recipient.name}!`, '', finale.message]
  if (finale.signature) lines.push(`— ${finale.signature}`)

  const wishes = voice.messages.filter((m) => m.captions.length > 0)
  if (wishes.length) {
    lines.push('', vi ? 'LỜI CHÚC' : 'MESSAGES')
    wishes.forEach((m, i) => {
      lines.push('', `${i + 1}. ${m.from ? (vi ? `Từ ${m.from}` : `From ${m.from}`) : vi ? 'Lời chúc' : 'Message'}:`)
      lines.push(`   ${m.captions.map((c) => c.text).join(' ')}`)
    })
  }

  const captioned = gallery.photos.filter((p) => p.caption || p.detail)
  if (captioned.length) {
    lines.push('', vi ? 'KỶ NIỆM' : 'MEMORIES')
    gallery.photos.forEach((p, i) => {
      if (p.caption || p.detail) lines.push(`${pad(i + 1)}. ${[p.caption, p.detail].filter(Boolean).join(' — ')}`)
    })
  }

  const credits = musicCredits(config.audio.tracks.map((t) => t.src))
  if (credits.length) lines.push('', vi ? 'Nhạc nền:' : 'Music:', ...credits.map((c) => `  ${c}`))
  if (missing.length) {
    lines.push('', vi ? 'Không tải được (thử lại khi mạng ổn định):' : 'Could not be downloaded:', ...missing.map((m) => `  ${m}`))
  }
  const day = savedOn.toLocaleDateString(vi ? 'vi-VN' : 'en-GB')
  lines.push('', vi ? `Lưu ngày ${day} từ BirthdayVerse.` : `Saved on ${day} from BirthdayVerse.`, '')
  return lines.join('\r\n')
}

/**
 * Collects the page's keepsakes into one ZIP: the card, every photo, the
 * portrait, each voice message and a text letter. Music is not included
 * (it's licensed for playback here, not redistribution).
 */
export async function buildKeepsakeZip(
  config: BirthdayConfig,
  card: Blob | null,
  onProgress: (done: number, total: number) => void,
  savedOn = new Date(),
): Promise<Uint8Array> {
  const vi = config.meta.lang !== 'en'
  const folders = vi ? { photos: 'anh', voices: 'loi-chuc' } : { photos: 'photos', voices: 'messages' }
  const jobs: Array<{ src: string; name: (ext: string) => string; label: string }> = []

  if (config.recipient.portrait) {
    jobs.push({ src: config.recipient.portrait, name: (e) => `${folders.photos}/00 ${vi ? 'Chân dung' : 'Portrait'}.${e}`, label: vi ? 'Ảnh chân dung' : 'Portrait' })
  }
  config.gallery.photos.forEach((p, i) => {
    const title = safeFileName(p.caption ?? '', vi ? 'Kỷ niệm' : 'Memory')
    jobs.push({ src: p.src, name: (e) => `${folders.photos}/${pad(i + 1)} ${title}.${e}`, label: `${vi ? 'Ảnh' : 'Photo'} ${i + 1}` })
  })
  config.voice.messages.forEach((m, i) => {
    if (!m.src) return
    const who = safeFileName(m.from, vi ? 'Lời chúc' : 'Message')
    jobs.push({ src: m.src, name: (e) => `${folders.voices}/${pad(i + 1)} ${who}.${e}`, label: `${vi ? 'Lời chúc' : 'Message'} ${i + 1}` })
  })

  const entries: ZipEntry[] = []
  const missing: string[] = []
  if (card) {
    entries.push({ name: vi ? 'Thiệp kỷ niệm.jpg' : 'Keepsake card.jpg', data: new Uint8Array(await card.arrayBuffer()) })
  }
  const total = jobs.length
  onProgress(0, total)
  for (const [i, job] of jobs.entries()) {
    const file = await fetchFile(job.src)
    if (file) entries.push({ name: job.name(file.ext), data: file.data })
    else missing.push(job.label)
    onProgress(i + 1, total)
  }
  entries.push({
    name: vi ? 'Lời chúc.txt' : 'Messages.txt',
    data: new TextEncoder().encode('﻿' + keepsakeLetter(config, savedOn, missing)),
  })
  return createZip(entries, savedOn)
}
