import { upload as blobUpload } from '@vercel/blob/client'

export type UploadKind = 'photo' | 'portrait' | 'voice' | 'music' | 'sound'

const MAX_EDGE: Record<'photo' | 'portrait', number> = { photo: 1600, portrait: 800 }
const MAX_AUDIO_BYTES = 25 * 1024 * 1024

const AUDIO_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
}

export class UploadError extends Error {}

function extension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Shrinks a photo to a web-friendly size before upload (≤1600px, WebP or
 * JPEG). Animated GIFs are kept as they are.
 */
export async function preparePhoto(file: File, kind: 'photo' | 'portrait'): Promise<File> {
  if (file.type === 'image/gif') return file
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new UploadError(`Không đọc được ảnh "${file.name}". Hãy dùng JPG, PNG hoặc WebP (ảnh HEIC của iPhone cần chuyển sang JPG).`)
  }
  const max = MAX_EDGE[kind]
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  let blob = await canvasToBlob(canvas, 'image/webp', 0.82)
  let ext = 'webp'
  if (!blob || blob.type !== 'image/webp') {
    // Safari can't encode WebP from a canvas.
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.85)
    ext = 'jpg'
  }
  if (!blob) throw new UploadError(`Không xử lý được ảnh "${file.name}".`)
  const base = file.name.replace(/\.[^.]+$/, '') || 'photo'
  return new File([blob], `${base}.${ext}`, { type: blob.type })
}

/** Checks an audio file and gives it a reliable MIME type (some browsers leave .m4a blank). */
export function prepareAudio(file: File): File {
  if (file.size > MAX_AUDIO_BYTES) throw new UploadError(`"${file.name}" lớn hơn 25 MB. Hãy nén lại (MP3 128 kbps là đủ).`)
  const type = file.type && file.type.startsWith('audio/') ? file.type : AUDIO_TYPES[extension(file.name)]
  if (!type) throw new UploadError(`"${file.name}" không phải file âm thanh được hỗ trợ (MP3, M4A, WAV, OGG).`)
  return type === file.type ? file : new File([file], file.name, { type })
}

/** Length of an audio file in seconds, read from its metadata. */
export function audioDuration(file: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const el = new Audio()
    const done = (value: number | null) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }
    el.preload = 'metadata'
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null)
    el.onerror = () => done(null)
    el.src = url
  })
}

/** Uploads to Vercel Blob (production) or the local dev store, returning the public URL. */
export async function uploadFile(file: File, slug: string, kind: UploadKind, storage: 'blob' | 'local'): Promise<string> {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+/, '').slice(-60) || 'file'
  if (storage === 'blob') {
    const result = await blobUpload(`assets/${slug}/${kind}-${safeName}`, file, {
      access: 'public',
      handleUploadUrl: `/api/upload?slug=${encodeURIComponent(slug)}`,
      contentType: file.type,
    })
    return result.url
  }
  const res = await fetch(`/api/upload?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(`${kind}-${safeName}`)}`, {
    method: 'POST',
    body: file,
    headers: { 'Content-Type': file.type },
    credentials: 'same-origin',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new UploadError((body as { error?: string }).error ?? `Tải lên thất bại (HTTP ${res.status})`)
  return (body as { url: string }).url
}
