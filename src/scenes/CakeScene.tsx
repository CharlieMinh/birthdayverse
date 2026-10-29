import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useConfig } from '../config/ConfigContext'
import { useDirector } from '../engine/DirectorContext'
import { useGsap } from '../hooks/useGsap'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { FxCanvas, type FxHandle } from '../components/FxCanvas'
import type { SceneProps } from './types'

const CANDLE_TOP = 50
const CANDLE_HEIGHT = 36

/**
 * Scene 4 — the cake. Candles light up, then the scene waits for a tap
 * (an interaction gate) before blowing them out and moving to the finale.
 */
export function CakeScene({ leaving }: SceneProps) {
  const { cake, timings, theme } = useConfig()
  const director = useDirector()
  const reduced = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const fx = useRef<FxHandle>(null)
  const gsapCtx = useRef<gsap.Context | null>(null)
  const [canBlow, setCanBlow] = useState(false)
  const [blown, setBlown] = useState(false)

  const count = Math.max(1, Math.min(12, Math.round(cake.candles)))
  const spacing = Math.min(26, 128 / count)
  const candleX = Array.from({ length: count }, (_, i) => 150 + (i - (count - 1) / 2) * spacing)

  useGsap(
    root,
    (ctx) => {
      gsapCtx.current = ctx
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from(root.current, { autoAlpha: 0, duration: timings.crossfade, ease: 'power1.inOut' })
        .from('[data-cake-head] > *', { autoAlpha: 0, y: reduced ? 0 : 14, duration: 1, stagger: 0.15 }, 0.3)
        .from('[data-cake]', { autoAlpha: 0, y: reduced ? 0 : 50, duration: 1.6 }, 0.4)
        .from('[data-flame-wrap]', { scale: 0, autoAlpha: 0, transformOrigin: '50% 100%', duration: 0.5, stagger: 0.18, ease: 'back.out(3)' }, 1.4)
        .from('[data-room-glow]', { autoAlpha: 0, duration: 1.5 }, 1.4)
        .call(() => director.audio.effect('sparkle'), [], 1.5)
        .call(() => setCanBlow(true), [], Math.max(timings.cakeIntro, 1.4 + count * 0.18 + 0.5))
    },
    [],
  )

  const blow = () => {
    if (!canBlow || blown || leaving) return
    setBlown(true)
    director.audio.effect('whoosh')
    void director.audio.playCue('blow')
    gsapCtx.current?.add(() => {
      const q = gsap.utils.selector(root.current)
      const tl = gsap.timeline()
      tl.to(q('[data-hint]'), { autoAlpha: 0, duration: 0.3 }, 0)
        .to(q('[data-flame-wrap]'), { scaleY: 0.2, scaleX: 0.6, autoAlpha: 0, transformOrigin: '50% 100%', duration: 0.35, stagger: 0.07, ease: 'power2.in' }, 0.1)
        .to(q('[data-room-glow]'), { autoAlpha: 0.15, duration: 1.2, ease: 'power2.out' }, 0.2)
      if (!reduced) {
        tl.fromTo(
          q('[data-smoke]'),
          { autoAlpha: 0.3, y: 0, scale: 0.6 },
          { autoAlpha: 0, y: -70, x: () => gsap.utils.random(-14, 14), scale: 2.2, duration: 2.4, stagger: 0.04, ease: 'power1.out' },
          0.25,
        )
      }
      tl.call(() => {
        fx.current?.confetti(140, 0.5, 0.15)
        director.audio.effect('sparkle')
      }, [], 0.7)
        .fromTo(q('[data-after]'), { autoAlpha: 0, y: reduced ? 0 : 10 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 0.9)
        .call(() => director.complete('cake'), [], 3.4)
    })
  }

  return (
    <section
      ref={root}
      className="safe-pad relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-5 text-center"
      aria-label={cake.title}
      aria-hidden={leaving || undefined}
    >
      <div
        data-room-glow
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_52%,rgb(var(--c-glow)/0.22),transparent_55%)]"
      />
      <FxCanvas ref={fx} ambient="embers" colors={theme.celebration} reducedMotion={reduced} />

      <header data-cake-head className="relative z-10">
        <p className="font-body text-[11px] uppercase tracking-[0.42em] text-accent/85 sm:text-xs">{cake.title}</p>
      </header>

      <button
        type="button"
        data-cake
        onClick={blow}
        disabled={!canBlow || blown}
        aria-label={cake.hint}
        className="relative z-10 mt-6 w-[min(82vw,52svh,440px)] rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent enabled:cursor-pointer"
      >
        <svg viewBox="0 0 300 260" className="h-auto w-full overflow-visible" role="presentation">
          <defs>
            <filter id="smoke-blur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
            <linearGradient id="tier-bottom" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#f8d7e1" />
              <stop offset="1" stopColor="#d9849d" />
            </linearGradient>
            <linearGradient id="tier-top" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff6ea" />
              <stop offset="1" stopColor="#e8d2b8" />
            </linearGradient>
            <linearGradient id="drip" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#f6c97c" />
              <stop offset="1" stopColor="#d99a3e" />
            </linearGradient>
            <radialGradient id="flame-glow">
              <stop offset="0" stopColor="#ffe3a6" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="flame" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff7d6" />
              <stop offset="0.55" stopColor="#ffc861" />
              <stop offset="1" stopColor="#ff7a3d" />
            </linearGradient>
          </defs>

          {/* Plate */}
          <ellipse cx="150" cy="238" rx="138" ry="15" fill="#241b3a" />
          <ellipse cx="150" cy="235" rx="128" ry="11" fill="#33284f" />

          {/* Bottom tier */}
          <rect x="38" y="150" width="224" height="86" rx="14" fill="url(#tier-bottom)" />
          <ellipse cx="150" cy="152" rx="112" ry="12" fill="#fbe3ea" />
          {Array.from({ length: 13 }, (_, i) => (
            <circle key={i} cx={52 + i * 16.3} cy="222" r="3.2" fill="#f3c677" />
          ))}

          {/* Top tier with drips */}
          <rect x="72" y="88" width="156" height="68" rx="12" fill="url(#tier-top)" />
          <path
            d="M72 98 Q72 86 84 86 H216 Q228 86 228 98 V104 Q222 112 216 104 Q210 122 202 104 Q194 110 186 104 Q178 128 168 104 Q160 112 152 104 Q144 120 134 104 Q126 110 118 104 Q110 126 100 104 Q92 112 86 104 Q80 118 72 104 Z"
            fill="url(#drip)"
          />
          <ellipse cx="150" cy="88" rx="78" ry="8" fill="#f9d48c" />

          {/* Sprinkles */}
          {[
            [92, 130, 20], [118, 142, 70], [146, 128, -30], [176, 140, 45], [204, 128, 10], [110, 186, -40],
            [150, 196, 60], [194, 182, -15], [74, 196, 30], [228, 196, -60], [132, 172, 15], [216, 168, 80],
          ].map(([x, y, r], i) => (
            <rect key={i} x={x} y={y} width="8" height="2.6" rx="1.3" fill={theme.celebration[i % theme.celebration.length]} transform={`rotate(${r} ${x + 4} ${y + 1.3})`} />
          ))}

          {/* Candles */}
          {candleX.map((x, i) => (
            <g key={i}>
              <rect x={x - 3.5} y={CANDLE_TOP} width="7" height={CANDLE_HEIGHT} rx="2" fill={i % 2 ? '#ff9fb2' : '#9fd8ff'} />
              <rect x={x - 3.5} y={CANDLE_TOP + 8} width="7" height="3" fill="#ffffff" opacity="0.7" />
              <rect x={x - 3.5} y={CANDLE_TOP + 20} width="7" height="3" fill="#ffffff" opacity="0.7" />
              <line x1={x} y1={CANDLE_TOP} x2={x} y2={CANDLE_TOP - 4} stroke="#3a2a2a" strokeWidth="1.2" />
              {[0, 1, 2].map((s) => (
                <circle key={s} data-smoke cx={x} cy={CANDLE_TOP - 8} r={4 + s} fill="#cfc8d8" opacity="0" filter="url(#smoke-blur)" />
              ))}
              <g data-flame-wrap>
                <circle cx={x} cy={CANDLE_TOP - 12} r="16" fill="url(#flame-glow)" className={reduced ? '' : 'flame-glow'} />
                <path
                  className={reduced ? '' : 'flame'}
                  style={{ animationDelay: `${-i * 0.23}s` }}
                  d={`M${x} ${CANDLE_TOP - 24} C ${x + 6} ${CANDLE_TOP - 14}, ${x + 5.5} ${CANDLE_TOP - 4}, ${x} ${CANDLE_TOP - 3} C ${x - 5.5} ${CANDLE_TOP - 4}, ${x - 6} ${CANDLE_TOP - 14}, ${x} ${CANDLE_TOP - 24} Z`}
                  fill="url(#flame)"
                />
              </g>
            </g>
          ))}
        </svg>
      </button>

      <div className="relative z-10 mt-8 grid h-10 place-items-center">
        <p
          data-hint
          className={`col-start-1 row-start-1 font-body text-xs uppercase tracking-[0.3em] text-ink/80 transition-opacity duration-700 ${
            canBlow ? 'animate-pulse-soft opacity-100' : 'opacity-0'
          }`}
        >
          {cake.hint}
        </p>
        <p data-after className="invisible col-start-1 row-start-1 font-display text-3xl italic text-accent opacity-0" aria-live="polite">
          {blown ? cake.afterBlow : ''}
        </p>
      </div>
    </section>
  )
}
