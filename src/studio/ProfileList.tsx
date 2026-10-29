import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { THEME_IDS, THEME_LABELS, type ThemeId } from '../theme/presets'
import { api, pageUrl, type ProfileSummary } from './api'
import { Button, TextInput } from './ui'
import { Toast, useDialog } from './Feedback'
import { GiftCover } from './GiftCover'

const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' })
const updated = (value: string) => Number.isNaN(Date.parse(value)) ? 'Chưa có ngày cập nhật' : dateFormat.format(new Date(value))

export function ProfileList({ onOpen, onSignOut }: { onOpen: (slug: string) => void; onSignOut: () => void }) {
  const { ask, dialog } = useDialog()
  const [items, setItems] = useState<ProfileSummary[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [themeId, setThemeId] = useState<ThemeId>('starry')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const pendingSlug = useRef<string | null>(null)
  const operation = useRef(false)
  const load = useCallback(() => {
    setError('')
    api.list().then(setItems).catch(() => setError('Chưa tải được thư viện. Hãy kiểm tra kết nối và thử lại.'))
  }, [])
  useEffect(load, [load])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || operation.current) return
    operation.current = true
    setBusy(true); setError('')
    try {
      const profile = pendingSlug.current ? await api.get(pendingSlug.current) : await api.create(name.trim())
      pendingSlug.current = profile.slug
      await api.save({ ...profile, recipient: { ...profile.recipient, name: name.trim() }, themeId })
      pendingSlug.current = null
      onOpen(profile.slug)
    } catch { setError('Chưa hoàn tất bản nháp. Nội dung đã nhập vẫn được giữ; bạn có thể thử lại.') }
    finally { operation.current = false; setBusy(false) }
  }
  const duplicate = async (item: ProfileSummary) => {
    const newName = await ask({ title: 'Tạo thêm một món quà', message: 'Giữ lại phong cách và nội dung, rồi cá nhân hóa cho người nhận mới.', input: '', confirm: 'Tạo bản sao' })
    if (newName === null || operation.current) return
    operation.current = true; setBusy(true)
    try { onOpen((await api.create(newName.trim(), item.slug)).slug) }
    catch { setError('Không nhân bản được. Hãy thử lại.') }
    finally { operation.current = false; setBusy(false) }
  }
  const remove = async (item: ProfileSummary) => {
    if (operation.current) return
    if (await ask({ title: 'Xóa món quà này?', message: `Món quà của ${item.name || 'người nhận'} và các tệp riêng sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.`, danger: true, confirm: 'Xóa món quà' }) === null || operation.current) return
    operation.current = true; setBusy(true)
    try { await api.remove(item.slug); setNotice('Đã xóa món quà khỏi thư viện.'); load() }
    catch { setError('Không xóa được món quà. Hãy thử lại.') }
    finally { operation.current = false; setBusy(false) }
  }
  const copy = async (item: ProfileSummary) => {
    if (!item.published) { setNotice('Món quà đang là bản nháp. Mở thiết kế và xuất bản khi bạn sẵn sàng gửi.'); return }
    try { await navigator.clipboard.writeText(pageUrl(item.slug)); setNotice(`Đã sao chép link món quà của ${item.name}.`) }
    catch { void ask({ title: 'Sao chép đường link', message: 'Trình duyệt chưa cho phép sao chép tự động. Chọn đường link bên dưới và nhấn Ctrl+C hoặc ⌘C.', input: pageUrl(item.slug), readOnly: true }) }
  }
  const visible = items?.filter(item => item.name.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')) && (filter === 'all' || (filter === 'published' ? item.published : !item.published))) ?? []

  return <main className="studio-library">
    {dialog}
    {notice && <Toast message={notice} onClose={() => setNotice('')} />}
    <header className="studio-brandbar"><a href="/studio" className="studio-brand"><span aria-hidden="true">✳</span><div>birthdayverse<small>STUDIO / KHÔNG GIAN SÁNG TẠO</small></div></a><Button variant="ghost" onClick={onSignOut}>Đăng xuất ↗</Button></header>
    {creating ? <>
      <Button variant="ghost" disabled={busy} onClick={() => { setCreating(false); setError(''); load() }}>← Về thư viện</Button>
      <div className="creation-layout">
        <form onSubmit={create} className="creation-form">
          <p className="studio-kicker">BẮT ĐẦU MỘT ĐIỀU ĐẶC BIỆT</p><h1>Món quà này<br />dành cho <em>ai?</em></h1>
          <p className="studio-description">Một cái tên, một phong cách. Những kỷ niệm của bạn sẽ làm nên phần còn lại.</p>
          <TextInput label="Tên người nhận" value={name} onChange={setName} placeholder="Ví dụ: Minh" maxLength={120} />
          <fieldset className="theme-choices"><legend>Chọn cảm hứng</legend><p>Bạn luôn có thể đổi lại trong trình biên tập.</p>
            <div>{THEME_IDS.map(id => <button key={id} type="button" aria-pressed={themeId === id} onClick={() => setThemeId(id)} className={themeId === id ? 'selected' : ''}><GiftCover themeId={id} name="Happy birthday" /><span>{THEME_LABELS[id].vi}{themeId === id ? ' ✓' : ''}</span></button>)}</div>
          </fieldset>
          {error && <p role="alert" className="studio-error">{error}</p>}
          <Button type="submit" variant="primary" disabled={!name.trim() || busy}>{busy ? 'Đang chuẩn bị…' : 'Tạo bản nháp & bắt đầu →'}</Button>
          <p className="studio-small">Món quà chỉ được gửi khi bạn chọn xuất bản.</p>
        </form>
        <aside className="creation-preview"><span className="studio-kicker">MỘT CHÚT HÌNH DUNG</span><GiftCover themeId={themeId} name={name} /><p>Bìa minh họa · {THEME_LABELS[themeId].vi}</p><span>Ảnh, lời chúc và âm nhạc sẽ được thêm ở bước tiếp theo.</span></aside>
      </div>
    </> : <>
      <section className="studio-hero"><div><p className="studio-kicker">NHỮNG ĐIỀU NHỎ, CẢM XÚC LỚN</p><h1>Một chút sáng tạo.<br />Một người <em>thật đặc biệt.</em></h1><p>Gói những tấm ảnh, lời chúc và giai điệu thành<br className="desktop-break" /> một bất ngờ mang dấu ấn của bạn.</p><Button variant="primary" onClick={() => { setCreating(true); setError(''); setNotice('') }}>＋ Tạo món quà</Button></div><div className="hero-art" aria-hidden="true"><span className="art-orbit">✧</span><div className="art-note">for someone<br /><em>very special.</em><span>♡</span></div><div className="art-envelope"><span>♥</span></div><span className="art-label">made with love, by you</span></div></section>
      <section className="library-section" aria-labelledby="library-title"><div className="library-heading"><div><p className="studio-kicker">BỘ SƯU TẬP CỦA BẠN</p><h2 id="library-title">Những món quà <span>{items?.length ?? '…'}</span></h2></div><label className="studio-search"><span aria-hidden="true">⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm người đặc biệt…" aria-label="Tìm món quà theo tên" /></label></div>
        <div className="library-filters" aria-label="Lọc món quà">{[['all', 'Tất cả'], ['draft', 'Bản nháp'], ['published', 'Đã xuất bản']].map(([id,label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
        {error ? <div className="studio-error" role="alert">{error}<Button onClick={load}>Thử lại</Button></div> : items === null ? <p role="status">Đang mở thư viện của bạn…</p> : <div className="gift-grid">{visible.map(item => <article className="gift-card" key={item.slug}>
          <button className="gift-card-cover" onClick={() => onOpen(item.slug)} aria-label={`Thiết kế món quà của ${item.name}`}><GiftCover themeId={item.themeId} name={item.name} portrait={item.portrait} /></button>
          <div className="gift-card-body"><div className="gift-card-title"><h3>{item.name || 'Chưa đặt tên'}</h3><span className={`gift-badge ${item.published ? 'published' : ''}`}>{item.published ? 'Đã xuất bản' : 'Bản nháp'}</span></div><p>{THEME_LABELS[item.themeId].vi} · {item.photos} ảnh · {item.voices} lời chúc</p><small>Cập nhật {updated(item.updatedAt)}</small><Button variant="primary" onClick={() => onOpen(item.slug)}>Tiếp tục thiết kế ↗</Button><div className="gift-actions"><button onClick={() => void copy(item)}>Sao chép link</button><button disabled={busy} onClick={() => void duplicate(item)}>Nhân bản</button><button disabled={busy} className="delete-action" onClick={() => void remove(item)}>Xóa</button></div></div>
        </article>)}{visible.length === 0 && <div className="library-empty"><span aria-hidden="true">✧</span><h3>{items.length ? 'Chưa tìm thấy món quà này' : 'Món quà đầu tiên đang chờ bạn'}</h3><p>{items.length ? 'Thử một tên khác hoặc xem lại tất cả món quà.' : 'Bắt đầu từ một người bạn muốn làm họ mỉm cười.'}</p><Button onClick={() => { if (items.length) { setQuery(''); setFilter('all') } else setCreating(true) }}>{items.length ? 'Xóa bộ lọc' : 'Tạo món quà đầu tiên'}</Button></div>}</div>}
      </section><footer className="studio-footer">BIRTHDAYVERSE STUDIO<span>Những kỷ niệm xứng đáng với một món quà riêng.</span></footer>
    </>}
  </main>
}
