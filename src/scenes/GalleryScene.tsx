import { useRef } from 'react'
import { gsap } from 'gsap'
import { useConfig, useUi } from '../config/ConfigContext'
import { useDirector } from '../engine/DirectorContext'
import { useGsap } from '../hooks/useGsap'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { SafeImage } from '../components/SafeImage'
import type { MemoryPhoto } from '../config/types'
import type { SceneProps } from './types'

const PLACEHOLDER: MemoryPhoto = { src: '', alt: '' }

/**
 * Scene 2 — photos crossfade on one timeline, each with a slow Ken Burns push,
 * a blurred ambient backdrop and pointer parallax on larger screens.
 */
export function GalleryScene({ leaving }: SceneProps) {
  const { gallery, timings } = useConfig()
  const t = useUi()
  const director = useDirector()
  const reduced = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const photos = gallery.photos.length ? gallery.photos : [PLACEHOLDER]

  useGsap(
    root,
    () => {
      const per = timings.photoSeconds
      const total = per * photos.length
      const fade = Math.min(1.2, per * 0.3)
      const tl = gsap.timeline({ onComplete: () => director.complete('gallery') })

      tl.from(root.current, { autoAlpha: 0, duration: timings.crossfade, ease: 'power1.inOut' }, 0)
        .from('[data-gallery-title]', { autoAlpha: 0, y: reduced ? 0 : 14, duration: 1.2, ease: 'power3.out' }, 0.3)

      photos.forEach((_, i) => {
        const at = i * per
        const slide = `[data-slide="${i}"]`
        const backdrop = `[data-backdrop="${i}"]`
        const first = i === 0
        const last = i === photos.length - 1

        tl.fromTo([slide, backdrop], { autoAlpha: 0 }, { autoAlpha: 1, duration: first ? 1.4 : fade, ease: 'power1.inOut' }, first ? 0.2 : at)
        if (!reduced) {
          // Ken Burns: the photo drifts slower than its frame for depth.
          const dir = i % 2 === 0 ? 1 : -1
          tl.fromTo(`${slide} [data-photo]`, { scale: 1.06, xPercent: -2 * dir }, { scale: 1.16, xPercent: 2 * dir, duration: per + fade, ease: 'none' }, at)
            .fromTo(`${slide} [data-card]`, { y: 18, rotation: -0.6 * dir }, { y: -10, rotation: 0.6 * dir, duration: per + fade, ease: 'sine.inOut' }, at)
            .fromTo(backdrop, { scale: 1.25 }, { scale: 1.35, duration: per + fade, ease: 'none' }, at)
        }
        tl.from(`${slide} [data-caption] > *`, { autoAlpha: 0, y: reduced ? 0 : 16, duration: 0.9, stagger: 0.15, ease: 'power3.out' }, at + fade * 0.6)
        if (!last) tl.to([slide, backdrop], { autoAlpha: 0, duration: fade, ease: 'power1.inOut' }, at + per)
      })
      // Hold the full duration even if the last tween ends early.
      tl.set({}, {}, total)

      if (reduced || !window.matchMedia('(pointer: fine)').matches) return

      const xCard = gsap.quickTo('[data-parallax-near]', 'x', { duration: 0.9, ease: 'power3.out' })
      const yCard = gsap.quickTo('[data-parallax-near]', 'y', { duration: 0.9, ease: 'power3.out' })
      const xBack = gsap.quickTo('[data-parallax-far]', 'x', { duration: 1.4, ease: 'power3.out' })
      const yBack = gsap.quickTo('[data-parallax-far]', 'y', { duration: 1.4, ease: 'power3.out' })
      const onMove = (e: PointerEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5
        const ny = e.clientY / window.innerHeight - 0.5
        xCard(nx * 22)
        yCard(ny * 16)
        xBack(nx * -40)
        yBack(ny * -30)
      }
      window.addEventListener('pointermove', onMove)
      return () => window.removeEventListener('pointermove', onMove)
    },
    [],
  )

  return (
    <section ref={root} className="relative h-full w-full overflow-hidden" aria-label={gallery.title} aria-hidden={leaving || undefined}>
      {/* Ambient backdrop: a blurred, darkened copy of the current photo */}
      <div data-parallax-far className="absolute -inset-16">
        {photos.map((p, i) => (
          <div key={i} data-backdrop={i} className="invisible absolute inset-0 opacity-0">
            <SafeImage src={p.src} alt="" decorative className="h-full w-full scale-125 object-cover blur-3xl brightness-[0.45] saturate-150" />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgb(var(--c-bg)/0.85)_100%)]" />

      {/* Sits below the floating controls on phones, beside them on wider screens. */}
      <header className="absolute inset-x-0 top-[max(4.25rem,calc(env(safe-area-inset-top)+3.75rem))] z-10 px-5 text-center sm:top-8">
        <p data-gallery-title className="font-body text-[11px] uppercase tracking-[0.42em] text-accent/85 sm:text-xs">
          {gallery.title}
        </p>
      </header>

      <div data-parallax-near className="absolute inset-0">
        {photos.map((p, i) => (
          <figure
            key={i}
            data-slide={i}
            className="invisible absolute inset-0 flex flex-col items-center justify-center gap-6 px-5 pb-14 pt-28 opacity-0 sm:gap-8 lg:flex-row lg:gap-16 lg:px-[8vw]"
          >
            <div
              data-card
              className="relative aspect-[4/5] w-[min(84vw,calc(58svh*0.8),460px)] overflow-hidden rounded-[18px] shadow-[0_40px_90px_-30px_rgb(0_0_0/0.9)] ring-1 ring-ink/10 lg:w-[min(36vw,calc(70svh*0.8),520px)]"
            >
              <div data-photo className="h-full w-full will-change-transform">
                <SafeImage
                  src={p.src}
                  alt={p.alt}
                  fallbackLabel={`${t.memory} ${String(i + 1).padStart(2, '0')}`}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: p.focus ?? '50% 50%' }}
                />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,rgb(0_0_0/0.35))]" />
            </div>
            <figcaption data-caption className="max-w-md text-center lg:text-left">
              <span className="block font-body text-[11px] tracking-[0.3em] text-muted">
                {String(i + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
              </span>
              {p.caption && (
                <span className="mt-3 block font-display text-[2rem] font-light leading-tight text-ink sm:text-5xl">{p.caption}</span>
              )}
              {p.detail && <span className="mt-2 block font-body text-sm text-accent/80">{p.detail}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
