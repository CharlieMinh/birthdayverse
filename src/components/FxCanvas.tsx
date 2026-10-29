import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { gsap } from 'gsap'
import { useDirector } from '../engine/DirectorContext'

/**
 * One lightweight canvas particle system for stars, embers, fireworks and
 * confetti. Runs on GSAP's ticker and freezes while the director is paused.
 */

export interface FxHandle {
  /** Launch a firework that bursts at (x, y), both 0–1 of the canvas size. */
  firework(x: number, y: number): void
  /** Throw confetti from a point (0–1), defaulting to the top centre. */
  confetti(count: number, originX?: number, originY?: number): void
}

interface FxCanvasProps {
  ambient?: 'stars' | 'embers' | 'petals' | 'bokeh' | 'none'
  /** Launch fireworks on their own every so often. */
  autoFireworks?: boolean
  colors: string[]
  reducedMotion: boolean
  onBurst?: () => void
  className?: string
}

type Kind = 'star' | 'ember' | 'petal' | 'orb' | 'rocket' | 'spark' | 'confetti' | 'bloom'

interface Particle {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  rot: number
  vr: number
  phase: number
  targetY: number
}

const MAX_PARTICLES = 1400
const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]
const rand = (min: number, max: number) => min + Math.random() * (max - min)

export const FxCanvas = forwardRef<FxHandle, FxCanvasProps>(function FxCanvas(
  { ambient = 'none', autoFireworks = false, colors, reducedMotion, onBurst, className },
  ref,
) {
  const director = useDirector()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const size = useRef({ w: 0, h: 0 })
  const onBurstRef = useRef(onBurst)
  onBurstRef.current = onBurst
  const opts = useRef({ colors, reducedMotion, autoFireworks })
  opts.current = { colors, reducedMotion, autoFireworks }

  const add = (p: Partial<Particle> & Pick<Particle, 'kind' | 'x' | 'y'>) => {
    if (particles.current.length >= MAX_PARTICLES) return
    particles.current.push({
      vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', rot: 0, vr: 0, phase: Math.random() * Math.PI * 2, targetY: 0,
      ...p,
    })
  }

  const burst = (x: number, y: number) => {
    const { colors: palette, reducedMotion: reduced } = opts.current
    const color = pick(palette)
    if (reduced) {
      add({ kind: 'bloom', x, y, maxLife: 2.4, size: rand(60, 110), color })
    } else {
      const count = Math.round(rand(80, 110))
      const speed = rand(200, 320)
      // A brief flash sells the burst before the sparks spread.
      add({ kind: 'bloom', x, y, maxLife: 0.5, size: rand(70, 100), color })
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rand(-0.05, 0.05)
        const s = speed * rand(0.5, 1)
        add({
          kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          maxLife: rand(1.3, 2.1), size: rand(1.6, 3), color: Math.random() < 0.2 ? '#ffffff' : color,
        })
      }
    }
    onBurstRef.current?.()
  }

  useImperativeHandle(ref, () => ({
    firework(fx, fy) {
      const { w, h } = size.current
      const x = fx * w
      const y = fy * h
      if (opts.current.reducedMotion) burst(x, y)
      else add({ kind: 'rocket', x, y: h + 10, vx: rand(-20, 20), vy: -rand(520, 680), targetY: y, maxLife: 4, size: 2.2, color: '#ffe9c4' })
    },
    confetti(count, ox = 0.5, oy = -0.05) {
      const { w, h } = size.current
      const reduced = opts.current.reducedMotion
      const n = reduced ? Math.round(count * 0.35) : count
      for (let i = 0; i < n; i++) {
        add({
          kind: 'confetti',
          x: ox * w + rand(-w * 0.25, w * 0.25),
          y: oy * h + rand(-40, 0),
          vx: reduced ? rand(-15, 15) : rand(-160, 160),
          vy: reduced ? rand(30, 60) : rand(-60, 140),
          maxLife: rand(5, 8), size: rand(5, 9), color: pick(opts.current.colors),
          rot: rand(0, Math.PI), vr: reduced ? 0 : rand(-8, 8),
        })
      }
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const seedAmbient = () => {
      particles.current = particles.current.filter((p) => p.kind !== 'star' && p.kind !== 'ember')
      const { w, h } = size.current
      if (ambient === 'stars') {
        const n = Math.min(170, Math.round((w * h) / 8000))
        for (let i = 0; i < n; i++) {
          add({ kind: 'star', x: Math.random() * w, y: Math.random() * h, size: rand(0.4, 1.5), maxLife: Infinity, color: Math.random() < 0.15 ? '#ffdca8' : '#ffffff' })
        }
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { clientWidth: w, clientHeight: h } = canvas
      size.current = { w, h }
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seedAmbient()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    let launchIn = 0.6
    let emberIn = 0

    const tick = (_time: number, deltaMs: number) => {
      if (director.isPaused) return
      const dt = Math.min(deltaMs / 1000, 0.05)
      const { w, h } = size.current
      const reduced = opts.current.reducedMotion

      if (opts.current.autoFireworks) {
        launchIn -= dt
        if (launchIn <= 0) {
          launchIn = reduced ? rand(1.6, 2.4) : rand(0.55, 1.3)
          const handle = { x: rand(0.15, 0.85), y: rand(0.12, 0.42) }
          if (reduced) burst(handle.x * w, handle.y * h)
          else add({ kind: 'rocket', x: handle.x * w, y: h + 10, vx: rand(-25, 25), vy: -rand(520, 700), targetY: handle.y * h, maxLife: 4, size: 2.2, color: '#ffe9c4' })
        }
      }
      if (ambient === 'petals' && !reduced) {
        emberIn -= dt
        if (emberIn <= 0) {
          emberIn = rand(0.25, 0.6)
          add({ kind: 'petal', x: rand(-0.1, 1) * w, y: -15, vx: rand(10, 35), vy: rand(22, 45), maxLife: rand(14, 22), size: rand(5, 9), color: pick(opts.current.colors), rot: rand(0, Math.PI), vr: rand(-1.2, 1.2) })
        }
      }
      if (ambient === 'bokeh' && !reduced) {
        emberIn -= dt
        if (emberIn <= 0) {
          emberIn = rand(0.5, 1.1)
          add({ kind: 'orb', x: Math.random() * w, y: rand(0.1, 1) * h, vx: rand(-6, 6), vy: -rand(4, 12), maxLife: rand(7, 12), size: rand(14, 48), color: pick(opts.current.colors) })
        }
      }
      if (ambient === 'embers' && !reduced) {
        emberIn -= dt
        if (emberIn <= 0) {
          emberIn = rand(0.08, 0.2)
          add({ kind: 'ember', x: Math.random() * w, y: h + 5, vx: rand(-8, 8), vy: -rand(14, 38), maxLife: rand(6, 11), size: rand(0.8, 2), color: Math.random() < 0.5 ? '#ffdca8' : '#ff8fa3' })
        }
      }

      ctx.clearRect(0, 0, w, h)
      const list = particles.current
      let write = 0
      for (let i = 0; i < list.length; i++) {
        const p = list[i]
        p.life += dt
        if (p.life < p.maxLife && step(p, dt, h)) {
          draw(ctx, p, reduced)
          list[write++] = p
        } else if (p.kind === 'rocket') {
          burst(p.x, p.y)
        }
      }
      // In-place compaction. Sparks pushed by a burst mid-loop are appended
      // and visited by the same loop, since list.length is re-read each pass.
      list.length = write
    }

    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      observer.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambient, director])

  return <canvas ref={canvasRef} aria-hidden="true" className={className ?? 'pointer-events-none absolute inset-0 h-full w-full'} />
})

/** Advances a particle. Returns false when it should be removed. */
function step(p: Particle, dt: number, h: number): boolean {
  switch (p.kind) {
    case 'star':
      p.phase += dt * 1.2
      return true
    case 'ember':
      p.phase += dt
      p.x += (p.vx + Math.sin(p.phase * 1.3) * 10) * dt
      p.y += p.vy * dt
      return p.y > -10
    case 'rocket':
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 140 * dt
      return p.y > p.targetY && p.vy < -60
    case 'spark':
      p.vx *= 1 - 1.6 * dt
      p.vy = p.vy * (1 - 1.6 * dt) + 90 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      return true
    case 'confetti':
      p.phase += dt * 3
      p.vx *= 1 - 1.2 * dt
      p.vy = Math.min(p.vy + 220 * dt, 120)
      p.x += (p.vx + Math.sin(p.phase) * 30) * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      return p.y < h + 20
    case 'petal':
      p.phase += dt
      p.x += (p.vx + Math.sin(p.phase * 1.4) * 18) * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      return p.y < h + 20
    case 'orb':
      p.x += p.vx * dt
      p.y += p.vy * dt
      return true
    case 'bloom':
      return true
  }
}

function draw(ctx: CanvasRenderingContext2D, p: Particle, reduced: boolean): void {
  const t = p.life / p.maxLife
  switch (p.kind) {
    case 'star': {
      const twinkle = reduced ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin(p.phase))
      ctx.globalAlpha = twinkle * 0.8
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'ember': {
      ctx.globalAlpha = Math.sin(Math.PI * t) * 0.7
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'rocket':
      ctx.globalAlpha = 1
      ctx.strokeStyle = p.color
      ctx.lineWidth = p.size
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03)
      ctx.stroke()
      break
    case 'spark': {
      ctx.globalAlpha = Math.max(0, 1 - t * t)
      ctx.strokeStyle = p.color
      ctx.lineWidth = p.size
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045)
      ctx.stroke()
      break
    }
    case 'confetti': {
      ctx.globalAlpha = t > 0.85 ? (1 - t) / 0.15 : 1
      ctx.fillStyle = p.color
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.scale(1, Math.cos(p.phase * 1.7))
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      ctx.restore()
      break
    }
    case 'petal': {
      ctx.globalAlpha = Math.min(1, p.life * 2, (p.maxLife - p.life) * 2) * 0.75
      ctx.fillStyle = p.color
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.scale(1, 0.55 + 0.35 * Math.cos(p.phase * 2))
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      break
    }
    case 'orb': {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
      g.addColorStop(0, p.color)
      g.addColorStop(1, 'transparent')
      ctx.globalAlpha = Math.sin(Math.PI * t) * 0.22
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'bloom': {
      const r = p.size * (0.4 + t * 0.8)
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
      g.addColorStop(0, p.color)
      g.addColorStop(1, 'transparent')
      ctx.globalAlpha = Math.sin(Math.PI * t) * 0.55
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fill()
      break
    }
  }
  ctx.globalAlpha = 1
}
