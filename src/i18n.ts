import type { Lang } from './config/types'

/** Interface text that isn't part of a profile's editable copy. */
const STRINGS = {
  vi: {
    openInvitation: (name: string) => `Mở lời mời dành cho ${name}`,
    mute: 'Tắt tiếng',
    unmute: 'Bật tiếng',
    pause: 'Tạm dừng',
    resume: 'Tiếp tục',
    replayFromStart: 'Xem lại từ đầu',
    fullscreen: 'Toàn màn hình',
    exitFullscreen: 'Thoát toàn màn hình',
    pausedHint: 'Đã tạm dừng · chạm để tiếp tục',
    from: 'từ',
    memory: 'Kỷ niệm',
    startAgain: 'Bắt đầu lại',
    invitation: 'Lời mời',
  },
  en: {
    openInvitation: (name: string) => `Open the invitation for ${name}`,
    mute: 'Mute',
    unmute: 'Unmute',
    pause: 'Pause',
    resume: 'Resume',
    replayFromStart: 'Replay from the start',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    pausedHint: 'Paused · tap to resume',
    from: 'from',
    memory: 'Memory',
    startAgain: 'Start again',
    invitation: 'Invitation',
  },
}

export type UiStrings = (typeof STRINGS)['vi']

export function uiStrings(lang: Lang): UiStrings {
  return STRINGS[lang] ?? STRINGS.vi
}
