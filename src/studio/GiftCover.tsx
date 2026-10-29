import { THEME_PRESETS, type ThemeId } from '../theme/presets'

export function GiftCover({ themeId, name, portrait }: { themeId: ThemeId; name: string; portrait?: string }) {
  const theme = THEME_PRESETS[themeId]
  return <div className="gift-cover" style={{ background: theme.backdrop, backgroundColor: theme.colors.bg, color: theme.colors.text }}>
    <span className="cover-star star-one" aria-hidden="true">✦</span><span className="cover-star star-two" aria-hidden="true">✧</span>
    <span className="cover-eyebrow">MỘT MÓN QUÀ DÀNH RIÊNG CHO</span>
    {portrait ? <img className="cover-portrait" src={portrait} alt="" /> : <div className="cover-envelope" style={{ background: theme.colors.env1 }} aria-hidden="true"><span style={{ background: theme.colors.accent, color: theme.colors.bg }}>♥</span></div>}
    <strong style={{ color: theme.colors.accent }}>{name.trim() || 'Người đặc biệt'}</strong>
    <span className="cover-caption">Một ngày thật đáng nhớ.</span>
  </div>
}
