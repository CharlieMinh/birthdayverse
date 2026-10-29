import type { BirthdayConfig } from '../config/types'
import type { AudioEngine } from '../audio/AudioEngine'

export interface PreloadResult {
  /** Photos that failed to load; scenes render a styled fallback for these. */
  failedImages: Set<string>
  timedOut: boolean
}

const OVERSIZED_PX = 2600

function loadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (import.meta.env.DEV && Math.max(img.naturalWidth, img.naturalHeight) > OVERSIZED_PX) {
        console.warn(`[preload] ${src} is ${img.naturalWidth}×${img.naturalHeight}; resize to ≤1600px for faster loading`)
      }
      // decode() keeps the first frame of the gallery from janking.
      if (img.decode) img.decode().then(() => resolve(true), () => resolve(true))
      else resolve(true)
    }
    img.onerror = () => {
      console.warn(`[preload] image failed to load: ${src}`)
      resolve(false)
    }
    img.src = src
  })
}

/**
 * Loads photos and audio before the envelope can be opened. Never blocks for
 * longer than `timeoutMs`: anything still loading continues in the background
 * and scenes fall back gracefully if it never arrives.
 */
export async function preloadExperience(
  config: BirthdayConfig,
  audio: AudioEngine,
  timeoutMs = 8000,
): Promise<PreloadResult> {
  const failedImages = new Set<string>()
  const srcs = config.gallery.photos.map((p) => p.src)
  if (config.recipient.portrait) srcs.unshift(config.recipient.portrait)
  const images = srcs.map(async (src) => {
    if (!(await loadImage(src))) failedImages.add(src)
  })
  const all = Promise.all([...images, audio.preload()]).then(() => false)
  let timer: number | undefined
  const timeout = new Promise<boolean>((resolve) => {
    timer = window.setTimeout(() => resolve(true), timeoutMs)
  })
  const timedOut = await Promise.race([all, timeout])
  window.clearTimeout(timer)
  if (timedOut) console.warn('[preload] still loading after timeout; continuing')
  return { failedImages, timedOut }
}
