import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useConfig, useUi } from '../config/ConfigContext'
import { useDirector } from '../engine/DirectorContext'
import { useAssets } from '../engine/AssetsContext'
import { useGsap } from '../hooks/useGsap'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { devStartScene } from '../lib/devScene'
import { Portrait } from '../components/Portrait'
import type { SceneProps } from './types'

/**
 * Scene 1 — a glowing envelope in the dark. The tap is the experience's
 * single audio-unlock gesture; the opening animation then hands off to the gallery.
 */
export function InvitationScene({ leaving }: SceneProps) {
  const config = useConfig()
  const t = useUi()
  const director = useDirector()
  const { ready } = useAssets()
  const reduced = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const [introDone, setIntroDone] = useState(false)
  const [opened, setOpened] = useState(false)
  const gsapCtx = useRef<gsap.Context | null>(null)
  const { invitation, recipient, timings } = config
  const initial = (recipient.shortName || recipient.name).trim().charAt(0).toUpperCase()
  const canOpen = introDone && ready && !opened && !leaving

  useGsap(
    root,
    (ctx) => {
      gsapCtx.current = ctx
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      const lift = reduced ? 0 : 1
      tl.from(root.current, { autoAlpha: 0, duration: 1.4, ease: 'power1.inOut' })
        .from('[data-eyebrow]', { autoAlpha: 0, y: 12 * lift, duration: 1 }, 0.5)
        .from('[data-title]', { autoAlpha: 0, y: 20 * lift, duration: 1.4 }, 0.8)
        .from('[data-envelope]', { autoAlpha: 0, y: 40 * lift, scale: reduced ? 1 : 0.92, duration: 1.8 }, 1.1)
        .from('[data-halo]', { autoAlpha: 0, scale: 0.6, duration: 2.4, ease: 'sine.out' }, 1.3)
        .call(() => setIntroDone(true), [], Math.max(timings.invitationIntro, 2.5))

      if (!reduced) {
        gsap.to('[data-float]', { y: -10, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        gsap.to('[data-halo]', { scale: 1.08, opacity: 0.75, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      }
    },
    [],
  )

  const open = () => {
    if (!canOpen) return
    setOpened(true)
    // Everything below runs inside the tap so browsers allow audio.
    director.begin()
    director.audio.effect('chime')
    if (config.requestFullscreenOnStart) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined)
    }

    const skipTo = devStartScene()
    if (skipTo) {
      director.jumpTo(skipTo)
      return
    }

    // Added to the scene's context so it is cleaned up if the scene unmounts mid-way.
    gsapCtx.current?.add(() => playOpening())
  }

  const playOpening = () => {
    const q = gsap.utils.selector(root.current)
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } })
    tl.to(q('[data-hint]'), { autoAlpha: 0, duration: 0.4 })
      .to(q('[data-seal]'), { scale: 1.35, autoAlpha: 0, duration: 0.55, ease: 'back.in(2)' }, 0)
    if (reduced) {
      tl.to(q('[data-flap]'), { autoAlpha: 0, duration: 0.6 }, 0.4)
    } else {
      tl.to(q('[data-flap]'), { rotationX: 180, duration: 1, ease: 'power2.inOut' }, 0.4)
        // Once the flap is past vertical it sits behind the letter.
        .set(q('[data-flap]'), { zIndex: 1 }, 0.9)
    }
    tl.to(q('[data-letter]'), { yPercent: reduced ? 0 : -48, duration: 1.3, ease: 'power3.out' }, 1.1)
      .from(q('[data-letter-text]'), { autoAlpha: 0, duration: 0.8 }, 1.6)
      .call(() => director.audio.effect('sparkle'), [], 1.7)
      .to(q('[data-title], [data-eyebrow]'), { autoAlpha: 0, y: reduced ? 0 : -10, duration: 0.8 }, 1.6)
      .to(q('[data-envelope]'), { scale: reduced ? 1 : 1.12, duration: 2.2, ease: 'power1.in' }, 2.8)
      .call(() => director.complete('invitation'), [], 4.6)
  }

  return (
    <section
      ref={root}
      className="safe-pad relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-4 text-center"
      aria-label={t.invitation}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgb(var(--c-accent)/0.10),transparent_60%)]" />

      <p data-eyebrow className="font-body text-[11px] uppercase tracking-[0.42em] text-accent/80 sm:text-xs">
        {invitation.eyebrow}
      </p>
      <h1 data-title className="mt-4 max-w-[18ch] font-display text-[2.6rem] font-light leading-[1.02] text-ink sm:text-6xl">
        {invitation.title}
      </h1>

      <div data-envelope className="relative mt-12 sm:mt-14">
        <div
          data-halo
          className="pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(var(--c-glow)/0.35),transparent_65%)] blur-2xl"
        />
        <div data-float>
          <button
            type="button"
            onClick={open}
            disabled={!canOpen}
            aria-label={t.openInvitation(recipient.shortName || recipient.name)}
            className="envelope group relative block aspect-[3/2] w-[min(78vw,400px)] cursor-pointer rounded-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-accent disabled:cursor-default"
          >
            {/* Back */}
            <span className="absolute inset-0 rounded-[14px] border border-accent/25 bg-[linear-gradient(160deg,rgb(var(--c-env1)/0.6),rgb(var(--c-env2)))] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)]" />
            {/* Letter */}
            <span
              data-letter
              className="absolute inset-x-[7%] bottom-[6%] top-[8%] z-[2] flex items-start justify-center rounded-md bg-[linear-gradient(180deg,#fbf5ec,#efe2cf)] px-4 pt-[9%] shadow-lg sm:px-6"
            >
              <span data-letter-text className="block text-center font-display text-[1.05rem] italic leading-snug text-[#3a2a3f] sm:text-2xl">
                {invitation.letter}
              </span>
            </span>
            {/* Front pocket */}
            {/* Wrappers carry the drop shadows, which clip-path would otherwise cut off. */}
            <span className="absolute inset-0 z-[3] drop-shadow-[0_-3px_6px_rgb(0_0_0/0.45)]">
              <span className="envelope-pocket absolute inset-0 rounded-[14px] bg-[linear-gradient(200deg,rgb(var(--c-env1)/0.8),rgb(var(--c-env2)))]" />
            </span>
            {/* Flap */}
            <span data-flap className="envelope-flap absolute inset-x-0 top-0 z-[4] h-[58%] origin-top drop-shadow-[0_4px_8px_rgb(0_0_0/0.5)]">
              <span className="envelope-flap-shape absolute inset-0 rounded-t-[14px] bg-[linear-gradient(180deg,rgb(var(--c-env1)),rgb(var(--c-env2)/0.9))]" />
            </span>
            {/* Wax seal */}
            <span
              data-seal
              className="absolute left-1/2 top-[58%] z-[5] grid h-14 w-14 overflow-hidden -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffd9a8,#c98a3d_60%,#8a5420)] font-display text-2xl font-semibold text-[#3d240c] shadow-[0_0_30px_rgb(var(--c-accent)/0.6)] transition-transform duration-300 group-enabled:group-hover:scale-110 sm:h-16 sm:w-16"
            >
              <Portrait src={recipient.portrait} fallback={initial} className="h-full w-full rounded-full object-cover p-[3px]" />
            </span>
          </button>
        </div>
      </div>

      <p
        data-hint
        aria-live="polite"
        className={`mt-12 h-5 font-body text-xs uppercase tracking-[0.3em] transition-opacity duration-700 sm:mt-14 ${
          introDone ? 'opacity-100' : 'opacity-0'
        } ${canOpen ? 'animate-pulse-soft text-ink/80' : 'text-muted/70'}`}
      >
        {ready ? invitation.hint : invitation.preparingHint}
      </p>
    </section>
  )
}
