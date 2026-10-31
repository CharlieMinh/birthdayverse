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
    keepsake: {
      open: 'Lưu kỷ niệm',
      title: 'Lưu kỷ niệm về máy',
      intro: 'Giữ lại món quà này trên điện thoại hoặc máy tính của bạn.',
      cardTitle: 'Thiệp kỷ niệm',
      cardDesc: 'Một tấm ảnh có tên, ảnh và lời chúc, hợp để lưu vào thư viện ảnh.',
      zipTitle: 'Toàn bộ kỷ niệm',
      zipDesc: (photos: number, voices: number) => `${photos} ảnh, ${voices} lời chúc giọng nói và một lá thư, gói trong một tệp .zip.`,
      prepare: 'Chuẩn bị',
      preparing: 'Đang chuẩn bị…',
      progress: (done: number, total: number) => `Đang gom ${done}/${total} tệp…`,
      save: 'Lưu về máy',
      again: 'Lưu lại lần nữa',
      saved: 'Đã lưu ✓',
      failed: 'Chưa chuẩn bị được. Kiểm tra mạng rồi thử lại.',
      retry: 'Thử lại',
      close: 'Đóng',
      hint: {
        ios: 'iPhone: chọn “Lưu hình ảnh” để vào app Ảnh, hoặc “Lưu vào Tệp” cho tệp .zip (mở là tự giải nén).',
        android: 'Android: chọn ứng dụng để lưu, hoặc tệp sẽ nằm trong thư mục Tải xuống.',
        desktop: 'Máy tính: tệp được tải vào thư mục Tải xuống.',
      },
    },
    musicCredit: 'Nhạc nền',
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
    keepsake: {
      open: 'Save keepsake',
      title: 'Save this keepsake',
      intro: 'Keep this gift on your phone or computer.',
      cardTitle: 'Keepsake card',
      cardDesc: 'One image with the name, photos and message — perfect for your photo library.',
      zipTitle: 'Everything',
      zipDesc: (photos: number, voices: number) => `${photos} photos, ${voices} voice messages and a letter, in one .zip file.`,
      prepare: 'Prepare',
      preparing: 'Preparing…',
      progress: (done: number, total: number) => `Collecting ${done}/${total} files…`,
      save: 'Save to device',
      again: 'Save again',
      saved: 'Saved ✓',
      failed: 'Could not prepare it. Check your connection and try again.',
      retry: 'Try again',
      close: 'Close',
      hint: {
        ios: 'iPhone: choose “Save Image” for Photos, or “Save to Files” for the .zip (tap it to unzip).',
        android: 'Android: pick an app to save with, or find it in Downloads.',
        desktop: 'Computer: the file goes to your Downloads folder.',
      },
    },
    musicCredit: 'Music',
  },
}

export type UiStrings = (typeof STRINGS)['vi']

export function uiStrings(lang: Lang): UiStrings {
  return STRINGS[lang] ?? STRINGS.vi
}
