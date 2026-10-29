# BirthdayVerse

Web chúc mừng sinh nhật dạng "phim ngắn" khoảng 2 phút: viết một lần, dùng cho mọi người. Mỗi người sinh nhật có **một trang riêng với link bí mật**, được tạo và chỉnh trong **Studio** online, không cần sửa code.

| Cảnh | Nội dung | Tương tác |
| --- | --- | --- |
| Lời mời | Phong bì phát sáng, con dấu là ảnh chân dung người sinh nhật | Chạm để mở (bật âm thanh) |
| Album ảnh | Ảnh trôi chậm, chú thích, nền mờ theo ảnh | — |
| Lời chúc | Nhiều voice phát lần lượt, mỗi đoạn có tên người gửi và phụ đề; nhạc tự nhỏ lại | — |
| Bánh kem | Nến lung linh | Chạm để thổi nến |
| Kết thúc | Pháo hoa, confetti, ảnh chân dung, tên và lời chúc | Chạm để bắn thêm pháo hoa, nút Xem lại |

Cảnh album hoặc cảnh lời chúc sẽ **tự bỏ qua** nếu trang không có ảnh hoặc không có lời chúc.

## Studio: tạo trang cho từng người

Mở `https://<tên-miền>/studio`, đăng nhập bằng mật khẩu quản trị.

- **Danh sách trang:** tạo mới, sửa, **nhân bản** (dùng trang cũ làm mẫu, giữ phong cách và nhạc), sao chép link, xoá.
- **Người nhận:** tên, tên gọi, tuổi, người gửi, ngôn ngữ (Việt/Anh), ảnh chân dung.
- **Phong cách:** Đêm sao, Pastel ngọt ngào, Vàng sang trọng, Neon tiệc tùng, Hoa anh đào. Mỗi phong cách có màu, nền, font tiếng Việt và hiệu ứng (sao, cánh hoa, đốm sáng) riêng.
- **Album ảnh:** chọn nhiều ảnh cùng lúc. Ảnh được **tự nén** (tối đa 1600 px, WebP) trước khi tải lên. Có chú thích, sắp xếp và thời gian mỗi ảnh.
- **Lời chúc:** thêm bao nhiêu voice tuỳ ý, mỗi voice có tên người gửi. Gõ nội dung rồi bấm **Tạo phụ đề tự động**; phụ đề được chia theo độ dài voice và sửa lại được.
- **Nhạc & âm thanh:** tải nhiều bài, chọn bài cho từng cảnh (hoặc im lặng), nhạc chuyển mượt. Thêm âm thanh riêng khi mở phong bì, khi thổi nến, khi bắn pháo hoa (ví dụ cả nhóm hát).
- **Xem thử** trang trước khi gửi. Bật **Xuất bản** thì người có link mới xem được.

Bấm **Lưu** (hoặc Ctrl+S) sau khi sửa. Trang đã xuất bản cập nhật sau khoảng 1 phút.

### Kích thước nên dùng

| Loại | Gợi ý |
| --- | --- |
| Ảnh | JPG/PNG/WebP bất kỳ (Studio tự nén). Ảnh HEIC của iPhone: chuyển sang JPG trước |
| Nhạc | MP3 128 kbps, tối đa 25 MB/bài |
| Voice | Ghi âm điện thoại (M4A/MP3), khoảng 10–40 giây mỗi người |

## Chạy trên máy

```bash
npm install
npm run dev
```

- http://localhost:5173/studio: Studio. Mật khẩu thử là `birthday` (đổi bằng `ADMIN_PASSWORD` trong `.env.local`). File được lưu trong thư mục `.data/`, chưa lên Internet.
- http://localhost:5173/demo: trang mẫu.
- Ở chế độ dev, thêm `?scene=gallery|voice|cake|finale` vào link trang để nhảy thẳng tới cảnh đó sau khi chạm phong bì.

## Triển khai lên Vercel

1. **Kho lưu trữ:** tạo một Vercel Blob store **public** và kết nối với project (Storage → Create → Blob), hoặc dùng lệnh `vercel blob create-store birthdayverse-media --access public --yes`. Vercel tự thêm `BLOB_READ_WRITE_TOKEN`.
2. **Biến môi trường** (Project → Settings → Environment Variables, cho Production và Preview):
   - `ADMIN_PASSWORD`: mật khẩu Studio do bạn tự đặt (dài, khó đoán).
   - `SESSION_SECRET`: chuỗi ngẫu nhiên dài (ví dụ kết quả của `openssl rand -hex 32`).
3. Deploy: `vercel deploy` tạo bản **Preview**, `vercel deploy --prod` cập nhật bản **chính thức**.

Lưu ý:

- Link Preview bị Vercel khoá bằng đăng nhập Vercel. Người nhận cần link **Production** (`/b/<mã>`).
- Gói miễn phí (Hobby) của Vercel Blob gồm 1 GB lưu trữ, 10 GB băng thông và 2.000 lượt ghi (tải file lên + lưu trang) mỗi tháng. Nếu vượt mức, Blob bị khoá 30 ngày và **không** bị tính tiền.
- Toàn bộ trang được đánh dấu `noindex` nên không hiện trên Google. Ai có link đều xem được, vì vậy chỉ gửi link cho đúng người.

## Kiến trúc

```
src/
  Boot.tsx                chọn trang theo URL (/b/<mã>, /demo), tải hồ sơ
  profile/schema.ts       kiểu dữ liệu hồ sơ + normalizeProfile (lọc mọi dữ liệu vào: URL an toàn, giới hạn số)
  theme/presets.ts        5 phong cách
  engine/director.ts      máy trạng thái: thứ tự cảnh, tạm dừng, tắt tiếng, xem lại, nhạc theo cảnh
  audio/AudioEngine.ts    Web Audio: nhiều bài nhạc (crossfade), nhiều voice, âm thanh tuỳ chọn, ducking
  scenes/                 5 cảnh
  studio/                 giao diện Studio (gói riêng, người nhận không tải)
server/
  api.ts                  toàn bộ API (đăng nhập, hồ sơ, tải file) dạng Request → Response
  blobStorage.ts          Vercel Blob (production)
  localStorage.ts         thư mục .data (chạy trên máy)
  devPlugin.ts            gắn API vào `vite dev`
api/index.ts              Vercel Function, nhận mọi /api/*
```

Một vài điểm thiết kế:

- **Mỗi cảnh có timeline GSAP riêng.** Tạm dừng sẽ đóng băng `gsap.globalTimeline` và `AudioContext`.
- **Phụ đề bám theo đồng hồ của voice**, nên không bị lệch.
- **Âm thanh chỉ bắt đầu sau lần chạm phong bì**, đúng quy định autoplay của trình duyệt. Trang có khai báo để iPhone vẫn phát âm thanh khi máy để chế độ im lặng (Safari 17 trở lên), nhưng điều này chưa được thử trên máy thật.
- **Đăng nhập Studio** dùng một mật khẩu và cookie HttpOnly có chữ ký HMAC. Mọi thao tác ghi đều kiểm tra Origin để chống gửi giả mạo.

## Lệnh

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy trên máy (kèm API và Studio) |
| `npm run build` | Typecheck + build |
| `npm run typecheck` / `npm run lint` | Kiểm tra code |
| `npm test` | Unit test (hồ sơ, phụ đề, API) |
