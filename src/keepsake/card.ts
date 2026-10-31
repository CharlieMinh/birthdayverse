import type { BirthdayConfig } from '../config/types'

const W = 1080
const H = 1920
const PAD = 70

/** Loads a (CORS-enabled) image into a bitmap, or null if it can't be read in time. */
export async function loadBitmap(src: string, timeoutMs = 10000): Promise<ImageBitmap | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(src, { signal: controller.signal, mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    try {
      return await createImageBitmap(blob)
    } catch {
      // Some formats (e.g. SVG) can't be decoded from a blob directly; go through an <img>.
      const url = URL.createObjectURL(blob)
      try {
        const img = new Image()
        img.src = url
        await img.decode()
        return await createImageBitmap(img)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Draws `img` to fill the box (like CSS object-fit: cover), clipped to rounded corners. */
function drawCover(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number, r: number, focusY = 0.5) {
  const scale = Math.max(w / img.width, h / img.height)
  const sw = w / scale
  const sh = h / scale
  const sx = (img.width - sw) / 2
  const sy = Math.min(img.height - sh, Math.max(0, (img.height - sh) * focusY))
  ctx.save()
  roundRect(ctx, x, y, w, h, r)
  ctx.clip()
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
  ctx.restore()
}

/** Splits text into lines that fit `maxWidth`, capped at `maxLines` (last line gets an ellipsis). */
export function wrapLines(measure: (s: string) => number, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (measure(next) <= maxWidth || !line) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last.length > 1 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1)
  kept[maxLines - 1] = `${last.trimEnd()}…`
  return kept
}

/** Photo grid layout for 1–6 photos inside a box. */
export function gridLayout(count: number): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 }
  if (count === 2) return { cols: 2, rows: 1 }
  if (count === 3) return { cols: 3, rows: 1 }
  if (count === 4) return { cols: 2, rows: 2 }
  return { cols: 3, rows: 2 }
}

function focusOf(focus: string | undefined): number {
  const y = focus ? Number(focus.split(' ')[1]?.replace('%', '')) : 50
  return Number.isFinite(y) ? y / 100 : 0.5
}

async function ensureFonts(display: string, body: string) {
  if (!('fonts' in document)) return
  const loads = [`italic 300 80px ${display}`, `600 100px ${display}`, `400 40px ${body}`, `600 30px ${body}`].map((f) =>
    document.fonts.load(f).catch(() => undefined),
  )
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 4000))])
}

/**
 * Renders a 1080×1920 keepsake card in the page's theme: portrait, name,
 * up to six photos, the closing message and signature. Returns a JPEG.
 */
export async function renderKeepsakeCard(config: BirthdayConfig, savedOn = new Date()): Promise<Blob> {
  const { theme, recipient, finale, gallery } = config
  const { colors, fonts } = theme
  await ensureFonts(fonts.display, fonts.body)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Backdrop: theme colour with soft glows.
  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, W, H)
  for (const [x, y, r, color, alpha] of [
    [W / 2, 260, 900, colors.accent, 0.22],
    [W * 0.1, H * 0.85, 800, colors.rose, 0.16],
    [W * 0.95, H * 0.55, 600, colors.glow, 0.1],
  ] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color + Math.round(alpha * 255).toString(16).padStart(2, '0'))
    g.addColorStop(1, color + '00')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  // A light sprinkle of stars (deterministic so re-renders match).
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  ctx.fillStyle = colors.glow
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.15 + rnd() * 0.5
    ctx.beginPath()
    ctx.arc(rnd() * W, rnd() * H, 0.8 + rnd() * 2.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  const fit = (text: string, weight: string, family: string, size: number, maxWidth: number) => {
    let s = size
    do {
      ctx.font = `${weight} ${s}px ${family}`
      if (ctx.measureText(text).width <= maxWidth) break
      s -= 4
    } while (s > 28)
    return s
  }

  let y = 190
  ctx.fillStyle = colors.accent
  fit(finale.headline, 'italic 300', fonts.display, 92, W - PAD * 2)
  ctx.fillText(finale.headline, W / 2, y)

  // Portrait in a glowing ring.
  y += 60
  const portrait = recipient.portrait ? await loadBitmap(recipient.portrait) : null
  if (portrait) {
    const r = 140
    const cx = W / 2
    const cy = y + r
    const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
    ring.addColorStop(0, colors.accent)
    ring.addColorStop(0.5, colors.rose)
    ring.addColorStop(1, colors.glow)
    ctx.shadowColor = colors.accent
    ctx.shadowBlur = 60
    ctx.fillStyle = ring
    ctx.beginPath()
    ctx.arc(cx, cy, r + 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    drawCover(ctx, portrait, cx - r, cy - r, r * 2, r * 2, r, 0.35)
    portrait.close()
    y = cy + r + 40
  }

  // Name.
  const nameSize = fit(recipient.name, '600', fonts.display, 128, W - PAD * 2)
  y += nameSize
  ctx.fillStyle = colors.text
  ctx.fillText(recipient.name, W / 2, y)
  if (recipient.age !== undefined) {
    y += 56
    ctx.font = `500 34px ${fonts.body}`
    ctx.fillStyle = colors.muted
    ctx.fillText(config.meta.lang === 'en' ? `Turning ${recipient.age}` : `Tuổi ${recipient.age}`, W / 2, y)
  }

  // Photo collage.
  const photos = gallery.photos.slice(0, 6)
  const bitmaps = await Promise.all(photos.map((p) => loadBitmap(p.src)))
  const usable = photos.map((p, i) => ({ p, img: bitmaps[i] })).filter((x): x is { p: typeof x.p; img: ImageBitmap } => x.img !== null)
  const footerTop = H - 560
  if (usable.length > 0) {
    const top = y + 60
    const boxH = Math.max(260, footerTop - top - 40)
    const { cols, rows } = gridLayout(usable.length)
    const gap = 18
    const cellW = (W - PAD * 2 - gap * (cols - 1)) / cols
    const cellH = Math.min(cellW * 1.25, (boxH - gap * (rows - 1)) / rows)
    const gridH = cellH * rows + gap * (rows - 1)
    const startY = top + (boxH - gridH) / 2
    usable.forEach(({ p, img }, i) => {
      const cx = PAD + (i % cols) * (cellW + gap)
      const cy = startY + Math.floor(i / cols) * (cellH + gap)
      ctx.shadowColor = 'rgba(0,0,0,0.45)'
      ctx.shadowBlur = 30
      ctx.fillStyle = colors.surface
      roundRect(ctx, cx, cy, cellW, cellH, 26)
      ctx.fill()
      ctx.shadowBlur = 0
      drawCover(ctx, img, cx, cy, cellW, cellH, 26, focusOf(p.focus))
      img.close()
    })
  }

  // Message and signature.
  let my = footerTop + 40
  ctx.font = `400 42px ${fonts.body}`
  ctx.fillStyle = colors.text
  for (const line of wrapLines((s) => ctx.measureText(s).width, finale.message, W - PAD * 2 - 40, 4)) {
    my += 60
    ctx.fillText(line, W / 2, my)
  }
  if (finale.signature) {
    my += 90
    ctx.fillStyle = colors.accent
    fit(finale.signature, 'italic 400', fonts.display, 58, W - PAD * 2)
    ctx.fillText(finale.signature, W / 2, my)
  }

  // Footer.
  ctx.font = `500 26px ${fonts.body}`
  ctx.fillStyle = colors.muted
  const day = savedOn.toLocaleDateString(config.meta.lang === 'en' ? 'en-GB' : 'vi-VN')
  ctx.fillText(`${day}  ·  BirthdayVerse`, W / 2, H - 70)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/jpeg', 0.9),
  )
}
