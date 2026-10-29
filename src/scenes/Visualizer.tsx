import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useDirector } from '../engine/DirectorContext'
import { hexToRgba } from '../lib/color'

interface VisualizerProps {
  /** Read live levels from the voice. When false, draws a gentle synthetic pulse. */
  live: boolean
  reducedMotion: boolean
  color: string
  className?: string
}

const BARS = 72

/** Radial audio-reactive ring around a soft glowing core. No microphone involved. */
export function Visualizer({ live, reducedMotion, color, className }: VisualizerProps) {
  const director = useDirector()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const settings = useRef({ live, reducedMotion, color })
  settings.current = { live, reducedMotion, color }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const data = new Uint8Array(128)
    const levels = new Float32Array(BARS)
    let t = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const tick = (_time: number, deltaMs: number) => {
      if (director.isPaused) return
      const { live: isLive, reducedMotion: reduced, color: c } = settings.current
      t += Math.min(deltaMs, 50) / 1000
      const analyser = isLive ? director.audio.voiceAnalyser : null
      if (analyser) analyser.getByteFrequencyData(data)

      let energy = 0
      for (let i = 0; i < BARS; i++) {
        // Mirror the spectrum so the ring is symmetrical.
        const k = i < BARS / 2 ? i : BARS - 1 - i
        let target: number
        if (analyser) target = data[Math.floor((k / (BARS / 2)) * 70) + 2] / 255
        else target = 0.18 + 0.12 * Math.sin(t * 1.6 + k * 0.35) * Math.sin(t * 0.7 + k * 0.12)
        if (reduced) target *= 0.5
        levels[i] += (target - levels[i]) * 0.2
        energy += levels[i]
      }
      energy /= BARS

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const cx = w / 2
      const cy = h / 2
      const base = Math.min(w, h) * 0.26
      ctx.clearRect(0, 0, w, h)

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * (1.5 + energy))
      glow.addColorStop(0, hexToRgba(c, 0.33))
      glow.addColorStop(1, hexToRgba(c, 0))
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, cy, base * (1.5 + energy), 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = hexToRgba(c, 1)
      ctx.lineCap = 'round'
      ctx.lineWidth = Math.max(1.5, base * 0.035)
      for (let i = 0; i < BARS; i++) {
        const a = (i / BARS) * Math.PI * 2 - Math.PI / 2
        const len = base * (0.08 + levels[i] * 0.75)
        ctx.globalAlpha = 0.35 + levels[i] * 0.65
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * base, cy + Math.sin(a) * base)
        ctx.lineTo(cx + Math.cos(a) * (base + len), cy + Math.sin(a) * (base + len))
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      ctx.fillStyle = hexToRgba(c, 0.13)
      ctx.beginPath()
      ctx.arc(cx, cy, base * (0.82 + energy * 0.25), 0, Math.PI * 2)
      ctx.fill()
    }

    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      observer.disconnect()
    }
  }, [director])

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />
}
