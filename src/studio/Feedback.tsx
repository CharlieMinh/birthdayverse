import { useEffect, useId, useRef, useState } from 'react'
import { Button } from './ui'

type Request = { title: string; message: string; confirm?: string; danger?: boolean; input?: string; readOnly?: boolean }

// eslint-disable-next-line react-refresh/only-export-components
export function useDialog() {
  const [request, setRequest] = useState<Request | null>(null)
  const resolver = useRef<((value: string | null) => void) | null>(null)
  useEffect(() => () => resolver.current?.(null), [])
  const ask = (options: Request) => new Promise<string | null>(resolve => {
    resolver.current?.(null)
    resolver.current = resolve
    setRequest(options)
  })
  const finish = (value: string | null) => {
    resolver.current?.(value)
    resolver.current = null
    setRequest(null)
  }
  return { ask, dialog: request ? <StudioDialog request={request} onFinish={finish} /> : null }
}

function StudioDialog({ request, onFinish }: { request: Request; onFinish: (value: string | null) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [value, setValue] = useState(request.input ?? '')
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    dialog?.showModal()
    return () => { dialog?.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} className="studio-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={e => { e.preventDefault(); onFinish(null) }}>
    <form onSubmit={e => { e.preventDefault(); onFinish(value.trim()) }}>
      <span className={`feedback-symbol ${request.danger ? 'danger' : ''}`} aria-hidden="true">{request.danger ? '!' : '✦'}</span>
      <p className="studio-kicker">BIRTHDAYVERSE STUDIO</p>
      <h2 id={titleId}>{request.title}</h2><p id={descriptionId}>{request.message}</p>
      {request.input !== undefined && <label className="dialog-field">{request.readOnly ? 'Đường link món quà' : 'Tên người nhận'}<input autoFocus={!request.danger} value={value} readOnly={request.readOnly} maxLength={request.readOnly ? undefined : 120} onFocus={e => e.target.select()} onChange={e => setValue(e.target.value)} placeholder="Ví dụ: Minh" required={!request.readOnly} /></label>}
      <div className="dialog-actions"><Button autoFocus={request.input === undefined} onClick={() => onFinish(null)}>{request.readOnly ? 'Đóng' : 'Quay lại'}</Button>{!request.readOnly && <Button type="submit" variant={request.danger ? 'danger' : 'primary'} disabled={request.input !== undefined && !value.trim()}>{request.confirm ?? 'Xác nhận'}</Button>}</div>
    </form>
  </dialog>
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="studio-toast" role="status" aria-live="polite"><span className="feedback-symbol" aria-hidden="true">✦</span><div><strong>Thông báo từ Studio</strong><p>{message}</p></div><button type="button" aria-label="Đóng thông báo" onClick={onClose}>×</button></div>
}
