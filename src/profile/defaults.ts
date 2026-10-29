import type { Lang } from '../config/types'

/** Default copy for new pages, per language. Every string is editable in the Studio. */
export const COPY_DEFAULTS: Record<
  Lang,
  {
    titleFor: (name: string) => string
    titleGeneric: string
    recipientFallback: string
    invitation: { eyebrow: string; title: string; letter: string; hint: string; preparingHint: string }
    gallery: { title: string }
    voice: { eyebrow: string }
    cake: { title: string; hint: string; afterBlow: string }
    finale: { headline: string; message: string; signature: string; replayLabel: string }
  }
> = {
  vi: {
    titleFor: (name) => `Một món quà nhỏ cho ${name}`,
    titleGeneric: 'Một bất ngờ sinh nhật',
    recipientFallback: 'Bạn',
    invitation: {
      eyebrow: 'Một lời mời bí mật',
      title: 'Có người đã chuẩn bị điều này cho bạn',
      letter: 'Gửi bạn — cùng xem lại những khoảnh khắc đáng nhớ nhé.',
      hint: 'Chạm vào phong bì để mở',
      preparingHint: 'Đang chuẩn bị bất ngờ…',
    },
    gallery: { title: 'Những khoảnh khắc bên nhau' },
    voice: { eyebrow: 'Lời chúc dành cho bạn' },
    cake: { title: 'Ước một điều nhé', hint: 'Chạm vào bánh để thổi nến', afterBlow: 'Điều ước đã được gửi đi.' },
    finale: {
      headline: 'Chúc mừng sinh nhật',
      message: 'Chúc bạn một tuổi mới thật rực rỡ, bình an và luôn được yêu thương.',
      signature: 'Thương bạn nhiều',
      replayLabel: 'Xem lại',
    },
  },
  en: {
    titleFor: (name) => `A little something for ${name}`,
    titleGeneric: 'A birthday surprise',
    recipientFallback: 'You',
    invitation: {
      eyebrow: 'A private invitation',
      title: 'Someone made you something',
      letter: 'For you — press play on a few of our favourite moments.',
      hint: 'Tap the envelope to open',
      preparingHint: 'Preparing your surprise…',
    },
    gallery: { title: 'Moments with you' },
    voice: { eyebrow: 'A message for you' },
    cake: { title: 'Make a wish', hint: 'Tap the cake to blow out the candles', afterBlow: 'Wish made.' },
    finale: {
      headline: 'Happy Birthday',
      message: 'Here’s to another year of you — brighter, bolder and even more loved.',
      signature: 'With love',
      replayLabel: 'Replay',
    },
  },
}
