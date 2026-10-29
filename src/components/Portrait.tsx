import { useState, type ReactNode } from 'react'

/** The birthday person's photo, or `fallback` when there is none or it fails to load. */
export function Portrait({ src, fallback, className }: { src?: string; fallback: ReactNode; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (!src || failedSrc === src) return <>{fallback}</>
  return (
    <img
      src={src}
      alt=""
      className={className}
      decoding="async"
      draggable={false}
      onError={() => setFailedSrc(src)}
    />
  )
}
