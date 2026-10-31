export type Platform = 'ios' | 'android' | 'desktop'

export function detectPlatform(): Platform {
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac but has touch.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

/**
 * Saves a file the way each platform expects. On phones the share sheet is
 * the reliable route ("Save Image" puts it in Photos on iPhone); elsewhere,
 * and when sharing isn't available, it downloads. Must be called directly
 * from a tap/click: browsers only allow sharing inside a user gesture.
 */
export async function saveFile(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const mobile = detectPlatform() !== 'desktop'
  if (mobile && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return 'cancelled'
      // Sharing failed (e.g. the gesture expired): fall through to a download.
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser time to start reading the blob before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'downloaded'
}
