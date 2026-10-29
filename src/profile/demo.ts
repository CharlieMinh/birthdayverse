import { normalizeProfile, type BirthdayProfile } from './schema'

/**
 * Built-in demo at /demo, using the placeholder photos in /public/photos and
 * the synthesized music box. Real pages are created in the Studio.
 */
export const demoProfile: BirthdayProfile = normalizeProfile({
  slug: 'demo',
  published: true,
  lang: 'vi',
  themeId: 'starry',
  recipient: { name: 'Minh', shortName: 'Minh', age: 25 },
  sender: { name: 'Cả nhóm' },
  invitation: { letter: 'Gửi Minh — cùng xem lại những khoảnh khắc đáng nhớ nhé.' },
  gallery: {
    photos: [
      { src: '/photos/memory-01.svg', alt: 'Ảnh mẫu 1', caption: 'Ngày đầu gặp nhau', detail: 'Mùa hè 2019' },
      { src: '/photos/memory-02.svg', alt: 'Ảnh mẫu 2', caption: 'Chuyến đi biển', detail: 'Vũng Tàu' },
      { src: '/photos/memory-03.svg', alt: 'Ảnh mẫu 3', caption: 'Cười không ngớt', detail: 'Mỗi tối thứ Sáu' },
      { src: '/photos/memory-04.svg', alt: 'Ảnh mẫu 4', caption: 'Chính là bạn', detail: 'Luôn luôn' },
      { src: '/photos/memory-05.svg', alt: 'Ảnh mẫu 5', caption: 'Đêm giao thừa náo nhiệt', detail: 'Năm mới' },
      { src: '/photos/memory-06.svg', alt: 'Ảnh mẫu 6', caption: 'Và còn nhiều nữa', detail: 'Chương tiếp theo' },
    ],
  },
  voice: {
    messages: [
      {
        from: 'Lan',
        captions: [
          { start: 0.3, end: 3.5, text: 'Chúc mừng sinh nhật nhé!' },
          { start: 3.8, end: 7.5, text: 'Cảm ơn vì đã luôn ở bên cả nhóm.' },
        ],
      },
      {
        from: 'Huy',
        captions: [
          { start: 0.3, end: 4, text: 'Tuổi mới thật nhiều niềm vui,' },
          { start: 4.2, end: 8, text: 'và đi thật nhiều nơi bạn muốn.' },
        ],
      },
    ],
  },
  finale: { signature: 'Thương bạn — cả nhóm' },
})
