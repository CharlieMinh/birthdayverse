import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useConfig, useUi } from '../config/ConfigContext'
import type { VoiceMessage } from '../config/types'
import { useDirector } from '../engine/DirectorContext'
import { useGsap } from '../hooks/useGsap'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { captionIndexAt, voiceMessageLength } from '../lib/captions'
import { Visualizer } from './Visualizer'
import type { SceneProps } from './types'

const VOICE_WAIT_SECONDS = 4

/**
 * Scene 3 — voice messages, one after another, each with the sender's name.
 * Music ducks while a voice plays and captions follow it.
 */
export function VoiceScene({ leaving }: SceneProps) {
  const { voice, timings, theme } = useConfig()
  const t = useUi()
  const director = useDirector()
  const reduced = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [live, setLive] = useState(false)
  const [spoken, setSpoken] = useState('')
  const messages = voice.messages
  const message = messages[index]

  useGsap(
    root,
    () => {
      gsap.from(root.current, { autoAlpha: 0, duration: timings.crossfade, ease: 'power1.inOut' })
      gsap.from('[data-voice-head] > *', { autoAlpha: 0, y: reduced ? 0 : 12, duration: 1.2, stagger: 0.2, delay: 0.3, ease: 'power3.out' })
      gsap.from('[data-visualizer]', { autoAlpha: 0, scale: reduced ? 1 : 0.85, duration: 1.8, delay: 0.2, ease: 'power2.out' })
    },
    [],
  )

  // The sender line crossfades whenever the message changes.
  const fromRef = useRef<HTMLParagraphElement>(null)
  useGsap(
    fromRef,
    () => {
      if (index > 0) gsap.from(fromRef.current, { autoAlpha: 0, y: reduced ? 0 : 8, duration: 0.8, ease: 'power2.out' })
    },
    [index],
  )

  const next = () => {
    if (index + 1 < messages.length) setIndex(index + 1)
    else director.complete('voice')
  }

  return (
    <section
      ref={root}
      className="safe-pad relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-5 text-center"
      aria-label={voice.eyebrow}
      aria-hidden={leaving || undefined}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgb(var(--c-rose)/0.10),transparent_65%)]" />

      <header data-voice-head className="relative z-10">
        <p className="font-body text-[11px] uppercase tracking-[0.42em] text-accent/85 sm:text-xs">{voice.eyebrow}</p>
        <p ref={fromRef} className="mt-2 min-h-[1.75rem] font-display text-xl italic text-muted">
          {message?.from ? `${t.from} ${message.from}` : ''}
        </p>
      </header>

      <div data-visualizer className="relative my-4 aspect-square w-[min(78vw,46svh,420px)]">
        <Visualizer live={live} reducedMotion={reduced} color={theme.colors.accent} className="absolute inset-0 h-full w-full" />
      </div>

      {messages.length > 1 && (
        <p className="relative z-10 -mt-2 mb-2 font-body text-[11px] tracking-[0.3em] text-muted/70" aria-hidden="true">
          {index + 1} / {messages.length}
        </p>
      )}

      {message && !leaving && (
        <MessagePlayer
          key={index}
          message={message}
          lead={index === 0 ? Math.min(1.2, timings.crossfade) : timings.voiceGap}
          tail={index === messages.length - 1 ? timings.voiceTail : 0}
          fallback={timings.voiceFallback}
          reduced={reduced}
          onLive={setLive}
          onSpoken={setSpoken}
          onDone={next}
        />
      )}
      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
    </section>
  )
}

interface MessagePlayerProps {
  message: VoiceMessage
  /** Seconds of quiet before this message starts. */
  lead: number
  /** Seconds of quiet after it ends. */
  tail: number
  fallback: number
  reduced: boolean
  onLive: (live: boolean) => void
  onSpoken: (text: string) => void
  onDone: () => void
}

/**
 * One message. When it has a voice file the caption timeline is scrubbed by
 * the audio clock, so captions can't drift; otherwise it runs as a silent letter.
 */
function MessagePlayer({ message, lead, tail, fallback, reduced, onLive, onSpoken, onDone }: MessagePlayerProps) {
  const director = useDirector()
  const root = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onLive, onSpoken, onDone })
  callbacks.current = { onLive, onSpoken, onDone }

  useGsap(
    root,
    (ctx) => {
      const { audio } = director
      const { captions } = message
      let cancelled = false
      let ducked = false
      let driver: (() => void) | null = null

      const duck = (on: boolean) => {
        if (on === ducked) return
        ducked = on
        audio.duck(on)
      }

      let started = false
      const start = (voiceDuration: number | null) => {
        if (cancelled || started) return
        started = true
        waitForVoice.kill()
        ctx.add(() => {
          const length = voiceMessageLength({ voiceDuration, captions, fallback })
          const tl = gsap.timeline({ paused: true, onComplete: () => callbacks.current.onDone() })
          captions.forEach((c, i) => {
            const sel = `[data-caption="${i}"]`
            tl.fromTo(
              `${sel} [data-word]`,
              { autoAlpha: 0, y: reduced ? 0 : 8, filter: 'blur(6px)' },
              {
                autoAlpha: 1,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.5,
                stagger: Math.min(0.08, (c.end - c.start) / 40),
                ease: 'power2.out',
              },
              c.start,
            )
              .set(sel, { autoAlpha: 1 }, c.start)
              .to(sel, { autoAlpha: 0, duration: 0.45, ease: 'power1.in' }, Math.max(c.start, c.end - 0.45))
          })
          tl.set({}, {}, length + tail)

          let lastIndex = -2
          const track = () => {
            const i = captionIndexAt(captions, tl.time())
            if (i !== lastIndex) {
              lastIndex = i
              callbacks.current.onSpoken(i >= 0 ? captions[i].text : '')
            }
          }

          gsap.delayedCall(lead, () => {
            if (voiceDuration === null) {
              tl.eventCallback('onUpdate', track).play()
              return
            }
            duck(true)
            callbacks.current.onLive(true)
            void audio.playVoice(message.src).then((ok) => {
              if (cancelled) return
              if (!ok) {
                duck(false)
                callbacks.current.onLive(false)
                tl.eventCallback('onUpdate', track).play()
                return
              }
              // Scrub to the voice's clock. When it ends, music comes back up
              // and the timeline plays out remaining captions and the tail.
              driver = () => {
                const elapsed = audio.voiceElapsed()
                if (elapsed !== null) tl.totalTime(elapsed)
                else if (tl.paused()) {
                  duck(false)
                  callbacks.current.onLive(false)
                  tl.play()
                }
                track()
              }
              gsap.ticker.add(driver)
            })
          })
        })
      }
      // On a slow connection the voice may still be downloading. Rather than
      // stall on a silent screen, play the captions as a silent letter.
      const waitForVoice = gsap.delayedCall(VOICE_WAIT_SECONDS, () => start(null))
      void audio.prepareVoice(message.src).then(start)

      return () => {
        cancelled = true
        if (driver) gsap.ticker.remove(driver)
        audio.stopVoice()
        duck(false)
        callbacks.current.onLive(false)
      }
    },
    [],
  )

  return (
    <div ref={root} className="relative z-10 grid min-h-[7.5rem] w-full max-w-2xl place-items-center sm:min-h-[9rem]">
      {message.captions.map((c, i) => (
        <p
          key={i}
          data-caption={i}
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 font-display text-[1.75rem] font-light leading-snug text-ink opacity-0 sm:text-[2.6rem]"
        >
          {c.text.split(' ').map((word, w) => (
            <span key={w} data-word className="inline-block">
              {word}&nbsp;
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}
