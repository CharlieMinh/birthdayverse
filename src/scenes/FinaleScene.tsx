import { useRef } from 'react'
import { gsap } from 'gsap'
import { useConfig } from '../config/ConfigContext'
import { useDirector, useDirectorState } from '../engine/DirectorContext'
import { useGsap } from '../hooks/useGsap'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { FxCanvas, type FxHandle } from '../components/FxCanvas'
import { ReplayIcon } from '../components/Icons'
import { Portrait } from '../components/Portrait'
import type { SceneProps } from './types'

const POP_GAP_MS = 140

/** Scene 5 — fireworks, confetti and the birthday message. Tap anywhere for more fireworks. */
export function FinaleScene({ leaving }: SceneProps) {
  const { finale, recipient, theme, timings } = useConfig()
  const director = useDirector()
  const { status } = useDirectorState()
  const reduced = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const fx = useRef<FxHandle>(null)
  const lastPop = useRef(0)
  const ended = status === 'ended' && !leaving

  useGsap(
    root,
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from(root.current, { autoAlpha: 0, duration: timings.crossfade, ease: 'power1.inOut' })
        .call(() => {
          fx.current?.confetti(220)
          director.audio.effect('chime')
        }, [], 0.2)
        .from('[data-age]', { autoAlpha: 0, scale: reduced ? 1 : 0.8, duration: 3, ease: 'power2.out' }, 0.2)
        .from('[data-portrait]', { autoAlpha: 0, scale: reduced ? 1 : 0.6, duration: 1.6, ease: 'back.out(1.6)' }, 0.3)
        .from('[data-headline]', { autoAlpha: 0, y: reduced ? 0 : 30, letterSpacing: reduced ? undefined : '0.3em', duration: 1.8 }, 0.5)
        .from('[data-name]', { autoAlpha: 0, y: reduced ? 0 : 40, scale: reduced ? 1 : 0.94, duration: 1.8 }, 1.2)
        .call(() => director.audio.effect('sparkle'), [], 1.4)
        .from('[data-message]', { autoAlpha: 0, y: reduced ? 0 : 16, duration: 1.4 }, 2.6)
        .from('[data-signature]', { autoAlpha: 0, duration: 1.4 }, 3.6)
        .call(() => director.complete('finale'), [], timings.finale)

      if (!reduced) {
        gsap.to('[data-headline]', { backgroundPosition: '200% 50%', duration: 6, ease: 'none', repeat: -1 })
      }
    },
    [],
  )

  const onBurst = () => {
    const now = performance.now()
    if (now - lastPop.current < POP_GAP_MS) return
    lastPop.current = now
    director.audio.effect('pop')
  }

  const launchAt = (e: React.PointerEvent<HTMLElement>) => {
    if (leaving || (e.target as HTMLElement).closest('button')) return
    const rect = e.currentTarget.getBoundingClientRect()
    fx.current?.firework((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
  }

  return (
    <section
      ref={root}
      onPointerDown={launchAt}
      className="safe-pad relative flex h-full w-full select-none flex-col items-center justify-center overflow-hidden px-5 text-center"
      aria-label={`${finale.headline}, ${recipient.name}`}
      aria-hidden={leaving || undefined}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgb(var(--c-accent)/0.12),transparent_60%)]" />
      <FxCanvas ref={fx} autoFireworks colors={theme.celebration} reducedMotion={reduced} onBurst={onBurst} />

      {recipient.age !== undefined && (
        <span
          data-age
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-[44vmin] font-light leading-none text-ink/[0.05]"
        >
          {recipient.age}
        </span>
      )}

      <div className="relative z-10 flex flex-col items-center">
        {recipient.portrait && (
          <div
            data-portrait
            className="mb-5 h-[clamp(84px,18svh,150px)] w-[clamp(84px,18svh,150px)] rounded-full bg-[conic-gradient(from_0deg,rgb(var(--c-accent)),rgb(var(--c-rose)),rgb(var(--c-glow)),rgb(var(--c-accent)))] p-[3px] shadow-[0_0_60px_rgb(var(--c-accent)/0.45)]"
          >
            <Portrait
              src={recipient.portrait}
              fallback={<span className="block h-full w-full rounded-full bg-surface" />}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
        )}
        <h1
          data-headline
          className="headline-shimmer bg-clip-text font-display text-[3.1rem] font-light italic leading-none text-transparent sm:text-7xl lg:text-8xl"
        >
          {finale.headline}
        </h1>
        <p data-name className="mt-3 max-w-[14ch] font-display text-[3.4rem] font-semibold leading-[0.95] text-ink sm:text-8xl lg:text-9xl">
          {recipient.name}
        </p>
        <p data-message className="mt-7 max-w-md font-body text-base leading-relaxed text-ink/80 sm:text-lg">
          {finale.message}
        </p>
        <p data-signature className="mt-5 font-display text-2xl italic text-accent">
          {finale.signature}
        </p>

        <div className={`mt-10 transition-all duration-1000 ${ended ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}>
          <button
            type="button"
            onClick={() => director.replay()}
            tabIndex={ended ? 0 : -1}
            className="inline-flex items-center gap-3 rounded-full border border-accent/50 bg-accent/10 px-7 py-3.5 font-body text-sm uppercase tracking-[0.25em] text-accent backdrop-blur transition hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent active:scale-95"
          >
            <ReplayIcon />
            {finale.replayLabel}
          </button>
        </div>
      </div>
    </section>
  )
}
