/**
 * Built-in background music served from /public/music. All tracks are by
 * Kevin MacLeod (incompetech.com), licensed CC BY 4.0: free to use as long
 * as the credit is easy to find: it appears in the "save keepsake" panel and
 * in the keepsake letter (the user asked to keep the finale screen clean).
 */

export type MusicMood = 'cheerful' | 'party' | 'gentle'

export interface LibraryTrack {
  id: string
  title: string
  file: string
  mood: MusicMood
  /** One line in Vietnamese describing when it fits. */
  note: string
}

export const MUSIC_MOODS: Record<MusicMood, string> = {
  cheerful: 'Vui tươi · hợp mọi lứa tuổi',
  party: 'Sôi động · tiệc bạn bè',
  gentle: 'Nhẹ nhàng · tình cảm, gia đình',
}

export const MUSIC_LIBRARY: LibraryTrack[] = [
  { id: 'carefree', title: 'Carefree', file: '/music/carefree.mp3', mood: 'cheerful', note: 'Ukulele vui vẻ, hợp album ảnh' },
  { id: 'fluffing-a-duck', title: 'Fluffing a Duck', file: '/music/fluffing-a-duck.mp3', mood: 'cheerful', note: 'Hài hước, nghịch ngợm, hợp ảnh troll' },
  { id: 'monkeys-spinning-monkeys', title: 'Monkeys Spinning Monkeys', file: '/music/monkeys-spinning-monkeys.mp3', mood: 'cheerful', note: 'Tinh nghịch, đáng yêu' },
  { id: 'cheery-monday', title: 'Cheery Monday', file: '/music/cheery-monday.mp3', mood: 'cheerful', note: 'Tươi sáng, nhẹ nhàng' },
  { id: 'happy-boy-end-theme', title: 'Happy Boy End Theme', file: '/music/happy-boy-end-theme.mp3', mood: 'cheerful', note: 'Ngắn, rộn ràng, hợp trẻ em' },
  { id: 'life-of-riley', title: 'Life of Riley', file: '/music/life-of-riley.mp3', mood: 'party', note: 'Rộn ràng, hợp màn pháo hoa' },
  { id: 'hyperfun', title: 'Hyperfun', file: '/music/hyperfun.mp3', mood: 'party', note: 'Năng động, nhịp nhanh' },
  { id: 'pixel-peeker-polka', title: 'Pixel Peeker Polka - faster', file: '/music/pixel-peeker-polka.mp3', mood: 'party', note: 'Vui nhộn kiểu game, tiệc tùng' },
  { id: 'dreamer', title: 'Dreamer', file: '/music/dreamer.mp3', mood: 'gentle', note: 'Piano mơ màng, hợp lời chúc' },
  { id: 'wallpaper', title: 'Wallpaper', file: '/music/wallpaper.mp3', mood: 'gentle', note: 'Êm, ấm, làm nền cho voice' },
  { id: 'bossa-antigua', title: 'Bossa Antigua', file: '/music/bossa-antigua.mp3', mood: 'gentle', note: 'Bossa nova sang trọng, hợp ông bà, bố mẹ' },
  { id: 'easy-lemon', title: 'Easy Lemon', file: '/music/easy-lemon.mp3', mood: 'gentle', note: 'Thư thái, dễ chịu' },
]

const BY_FILE = new Map(MUSIC_LIBRARY.map((t) => [t.file, t]))

export function libraryTrackFor(src: string): LibraryTrack | undefined {
  return BY_FILE.get(src)
}

export const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'

/** Credit lines required by CC BY 4.0 for the built-in tracks a page uses. */
export function musicCredits(srcs: string[]): string[] {
  const titles = [...new Set(srcs.map((s) => libraryTrackFor(s)?.title).filter((t): t is string => Boolean(t)))]
  return titles.map((t) => `“${t}” – Kevin MacLeod (incompetech.com), CC BY 4.0`)
}
