import { useState, type CSSProperties } from 'react'

interface SafeImageProps {
  src: string
  alt: string
  className?: string
  style?: CSSProperties
  /** Shown on the fallback panel when the image is missing or fails. */
  fallbackLabel?: string
  decorative?: boolean
}

const FALLBACK_BG =
  'radial-gradient(circle at 30% 25%, rgb(var(--c-rose) / 0.45), transparent 55%),' +
  'radial-gradient(circle at 75% 70%, rgb(var(--c-accent) / 0.4), transparent 60%),' +
  'rgb(var(--c-surface))'

/** An <img> that degrades to a soft gradient panel instead of a broken icon. */
export function SafeImage({ src, alt, className, style, fallbackLabel, decorative }: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) {
    return (
      <div
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative || undefined}
        className={`${className ?? ''} flex items-end`}
        style={{ ...style, background: FALLBACK_BG }}
      >
        {fallbackLabel && !decorative && (
          <span className="m-5 font-body text-[10px] uppercase tracking-[0.3em] text-ink/40">{fallbackLabel}</span>
        )}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={decorative ? '' : alt}
      aria-hidden={decorative || undefined}
      className={className}
      style={style}
      decoding="async"
      draggable={false}
      onError={() => setFailedSrc(src)}
    />
  )
}
