import { useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

// eslint-disable-next-line react-refresh/only-export-components
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function Button({
  variant = 'default',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger' | 'ghost' }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-bg hover:brightness-110',
        variant === 'default' && 'border border-ink/15 bg-ink/[0.04] text-ink hover:border-ink/30 hover:bg-ink/[0.08]',
        variant === 'danger' && 'border border-red-400/40 text-red-300 hover:bg-red-500/10',
        variant === 'ghost' && 'text-muted hover:bg-ink/[0.06] hover:text-ink',
        className,
      )}
    />
  )
}

export function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-ink/10 bg-surface/60 p-4 sm:p-6">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  )
}

const fieldClass =
  'w-full rounded-xl border border-ink/15 bg-bg/70 px-3 py-2.5 text-[15px] text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none'

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-xs text-muted/80">{hint}</p>}
    </div>
  )
}

export function TextInput(props: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  type?: 'text' | 'number'
  maxLength?: number
}) {
  return (
    <Field label={props.label} hint={props.hint}>
      {(id) => (
        <input
          id={id}
          type={props.type ?? 'text'}
          value={props.value}
          maxLength={props.maxLength ?? 400}
          placeholder={props.placeholder}
          onChange={(e) => props.onChange(e.target.value)}
          className={fieldClass}
        />
      )}
    </Field>
  )
}

export function TextArea(props: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  rows?: number
}) {
  return (
    <Field label={props.label} hint={props.hint}>
      {(id) => (
        <textarea
          id={id}
          rows={props.rows ?? 3}
          value={props.value}
          maxLength={2000}
          placeholder={props.placeholder}
          onChange={(e) => props.onChange(e.target.value)}
          className={cx(fieldClass, 'resize-y leading-relaxed')}
        />
      )}
    </Field>
  )
}

export function Select<T extends string>(props: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <Field label={props.label}>
      {(id) => (
        <select id={id} value={props.value} onChange={(e) => props.onChange(e.target.value as T)} className={fieldClass}>
          {props.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (value: number) => void
}) {
  return (
    <Field label={`${props.label}: ${props.format ? props.format(props.value) : props.value}`}>
      {(id) => (
        <input
          id={id}
          type="range"
          min={props.min}
          max={props.max}
          step={props.step ?? 1}
          value={props.value}
          onChange={(e) => props.onChange(Number(e.target.value))}
          className="w-full accent-[rgb(var(--c-accent))]"
        />
      )}
    </Field>
  )
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded accent-[rgb(var(--c-accent))]"
      />
      {label}
    </label>
  )
}

/** Click or drop files. Calls `onFiles` once per pick. */
export function DropZone(props: {
  accept: string
  multiple?: boolean
  label: string
  hint?: string
  busy?: boolean
  onFiles: (files: File[]) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        if (!props.busy) props.onFiles(Array.from(e.dataTransfer.files))
      }}
      className={cx(
        'rounded-2xl border-2 border-dashed p-5 text-center transition',
        over ? 'border-accent bg-accent/10' : 'border-ink/15 bg-bg/40',
      )}
    >
      <Button disabled={props.busy} onClick={() => input.current?.click()}>
        {props.busy ? 'Đang tải lên…' : props.label}
      </Button>
      {props.hint && <p className="mt-2 text-xs text-muted">{props.hint}</p>}
      <input
        ref={input}
        type="file"
        hidden
        accept={props.accept}
        multiple={props.multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) props.onFiles(files)
        }}
      />
    </div>
  )
}

export function IconButton(props: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink/10 text-muted transition hover:border-ink/30 hover:text-ink disabled:opacity-30"
    >
      {props.children}
    </button>
  )
}
