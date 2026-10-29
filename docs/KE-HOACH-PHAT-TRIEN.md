# BirthdayVerse — Kế hoạch nâng cấp cá nhân

Ngày lập: 29/10/2026. Chủ dự án: người dùng. Nhánh triển khai: `develop`.

## 1. Định hướng đã thống nhất

Xây một studio làm quà sinh nhật có gu, dùng lại cho bạn bè và người thân. Ưu tiên niềm vui sáng tạo, tính riêng tư và sự ổn định. Không xây SaaS, thanh toán, marketplace hoặc hệ thống tăng trưởng. Không yêu cầu AI trả phí để mở hoặc tạo quà.

Mục tiêu: một người có thể tự tạo, xem thử và gửi món quà cá nhân hóa; người nhận mở trên điện thoại không cần tài khoản. Mỗi món quà khác nhau về nội dung, hình ảnh, âm thanh và về sau là kịch bản.

## 2. Hiện trạng và giới hạn

- Đã có React/TypeScript, GSAP, Web Audio, Studio, hồ sơ theo người nhận, preview và xuất bản.
- Đã có nhiều ảnh, nhiều voice, nhạc theo cảnh, phụ đề nhập tay, cue mở thư/thổi nến/kết thúc.
- Có 5 theme: Đêm sao, Pastel, Vàng, Neon, Hoa anh đào. Đây là theme hiện có, chưa phải 5 kịch bản khác nhau.
- Cảnh vẫn theo thứ tự cố định; phụ đề tự động hiện chỉ phân bổ thời gian cho văn bản.
- Schema giới hạn 60 ảnh, 30 voice, 12 bài nhạc. UI cần báo trước thay vì để cắt dữ liệu khi lưu.
- Các kết quả review trước đây phải được kiểm tra lại trên checkout hiện tại trước khi sửa: public JSON bản nháp; state transcript khi đổi thứ tự; thao tác rời editor; save ghi đè chỉnh sửa mới.

## 3. Ngân sách và nguyên tắc tài nguyên

Mục tiêu tiền mặt: gần 0 trong nhóm nhỏ, tận dụng hạ tầng sẵn có. Hạn mức miễn phí có thể thay đổi và không bảo đảm lưu trữ vô hạn.

1. Xử lý ảnh, waveform, crop, cắt audio bằng trình duyệt khi phù hợp.
2. AI được dùng ngoài ứng dụng để tạo file rồi tải vào; tích hợp API chỉ khi có nhu cầu rõ ràng.
3. Hiển thị dung lượng trước gửi, kiểm soát số file và dung lượng từng file.
4. Tối ưu ảnh; tải trước cảnh kế tiếp; giải phóng audio buffer sau sử dụng.
5. Không tự động xóa quà hoặc mua thêm tài nguyên; cung cấp xuất backup và thao tác dọn có xác nhận.
6. Không đưa ảnh/voice cá nhân vào dịch vụ ngoài nếu người dùng chưa chủ động chọn.
7. Tài nguyên trang trí dùng SVG/CSS tự thiết kế hoặc có giấy phép sử dụng; lưu nguồn/giấy phép trong kho tài nguyên.

## 4. Danh mục công việc và nghiệm thu

### P0 — Độ tin cậy

- P0.1: bảo vệ JSON bản nháp ở storage và API; kiểm thử truy cập trực tiếp không có quyền. Thiết kế migration dữ liệu cũ trước khi thay storage.
- P0.2: cấp ID ổn định cho voice; đổi thứ tự vẫn giữ đúng tên, file, transcript và phụ đề.
- P0.3: báo giới hạn trước upload; API trả lỗi rõ ràng cho vượt giới hạn; không âm thầm bỏ nội dung.
- P0.4: lưu bản nháp IndexedDB theo slug và schema version; khi mở lại có lựa chọn khôi phục/bỏ; phân biệt lưu trên máy với lưu máy chủ.
- P0.5: bảo vệ thay đổi khi rời editor; lưu thành công chỉ cập nhật đúng revision đã gửi; serialize request lưu/xuất bản.
- P0.6: audio lỗi có thông báo và phương án tiếp tục; pause/resume/replay không tạo nguồn âm thanh trùng.

Nghiệm thu: refresh, đổi mục, quay lại thư viện, lỗi mạng và lưu chậm đều không âm thầm làm mất dữ liệu; quà cũ mở được.

### P1 — Studio sáng tạo và dễ dùng

- Thư viện quà có ảnh bìa theo theme, trạng thái rõ ràng, tìm theo tên, lọc nháp/đã gửi và thứ tự cập nhật.
- Một CTA chính “Tạo món quà”; bắt đầu bằng tên người nhận rồi chọn phong cách có preview.
- Tạo mới chỉ ghi hồ sơ khi người dùng xác nhận; lỗi giữ nguyên dữ liệu nhập và có thử lại.
- Editor chia thành mục: Người nhận, Phong cách, Lời mời, Album, Lời chúc, Nhạc, Bánh kem, Kết thúc.
- Thanh điều hướng giúp biết đang sửa phần nào; khung tổng quan luôn cho biết ảnh/voice/theme.
- Preview bìa là minh họa; nút “Xem thử” chạy trải nghiệm thật. Không gọi bìa tĩnh là live animation preview.
- Lưu, xem thử, xuất bản có trọng lượng khác nhau; không tự xuất bản khi chỉ muốn copy.
- Mobile dùng bố cục một cột, thanh mục cuộn ngang, nút thao tác chạm tối thiểu 44px.

Nghiệm thu: tạo, chọn theme, lưu, xem thử, nhân bản, copy và xóa vẫn dùng API thật; không có nút giả hoặc số liệu mẫu trong thư viện thật.

### P2 — Kịch bản linh hoạt

- Migrate schema v1 sang v2 với `scenes[]`: id, type, enabled, content, timing, transition, audio.
- ID instance độc lập với loại cảnh; hỗ trợ hai album trong một quà.
- Kéo thả có nút lên/xuống cho bàn phím; bật/tắt; nhân bản cảnh; undo.
- Điều kiện kết thúc: hết thời lượng, thao tác người nhận hoặc audio kết thúc; có fallback khi audio lỗi.
- Lưu mẫu riêng không chứa thông tin cá nhân nếu người tạo chọn “chỉ lưu phong cách”.

Nghiệm thu: reorder/replay/skip đúng; profile v1 tự chuyển an toàn; scene registry xử lý loại không hỗ trợ bằng thông báo, không crash toàn trang.

### P3 — Album nâng cao

Đợt đầu: Polaroid và Scrapbook. Mỗi ảnh có thời lượng, caption, điểm trọng tâm; editor xem trước ảnh trên khung dọc/ngang. Crop phải giữ file gốc hoặc cho phép đặt lại.

Đợt sau: Film strip, Photo wall, Before/After, Portrait reveal, video ngắn. Video có poster, giới hạn thời lượng/dung lượng, nút mute và fallback. GIF không tự chuyển thành ảnh tĩnh ngoài ý muốn.

Nghiệm thu: ảnh dọc/ngang không che mặt ở điểm trọng tâm; text dài không tràn; ảnh lỗi có fallback; chuyển động giảm khi người dùng chọn reduced motion.

### P4 — Bốn cảnh tương tác

| Cảnh | Dữ liệu cần nhập | Hành vi | Nghiệm thu |
|---|---|---|---|
| Hộp quà | Tiêu đề, nội dung mở ra, ảnh, cue | Chạm mở, reveal | Chỉ mở một lần mỗi lượt; replay reset |
| Dòng thời gian | Mốc, ngày, ảnh, caption, voice | Chuyển qua từng mốc | Không bắt buộc ngày; hỗ trợ bàn phím |
| Thiệp cào | Lớp phủ, nội dung, ngưỡng reveal | Cào bằng pointer | Có nút mở ngay; resize không mất nội dung |
| Câu đố | Câu hỏi, lựa chọn, lời giải | Trả lời mở bất ngờ | Có bỏ qua/gợi ý; đáp án sai không chặn quà |

Sau đó mới xét bức tường lời chúc, bầu trời điều ước, chọn nhánh. Thổi nến bằng micro là tùy chọn: xin quyền theo thao tác và luôn có nút chạm thay thế; không gửi bản ghi đi.

### P5 — Audio Studio

1. Ghi âm bằng MediaRecorder: bắt đầu/dừng/nghe lại/thu lại; xử lý từ chối quyền và định dạng không hỗ trợ.
2. Waveform dựng từ dữ liệu giải mã, không cần upload tới dịch vụ phân tích.
3. Trim không phá hủy: lưu offset/duration; fade in/out và âm lượng theo clip.
4. Marker thủ công: chạm đánh dấu khi nghe, gắn ảnh/cue vào marker.
5. Import SRT/VTT: kiểm tra encoding, mốc âm, câu chồng nhau; cho sửa và preview.
6. Scene có thể đợi voice xong; nhạc duck và trở lại bình thường; không phát cue hai lần khi render lại.

Nghiệm thu: thử ít nhất hai nhạc + ba voice + cue; pause giữa voice, chuyển tab rồi tiếp tục, replay, mất mạng và file hỏng. Kiểm tra Safari trên thiết bị thật khi có điều kiện; không suy ra hỗ trợ từ desktop.

### P6 — Bộ trải nghiệm và theme

- Scrapbook Friends: ảnh vui → câu đố → voice → hộp quà.
- Cinematic Memories: mở thư → dòng thời gian → lời chúc → finale.
- Neon Party: countdown → album theo marker → bánh → pháo hoa.

Mỗi bộ gồm màu, font, nền, bố cục, chuyển động, gợi ý âm thanh, thumbnail và phiên bản nhẹ. Tách theme, motion preset và scene template để phối hợp được.

Theme JSON chỉ chứa token và dữ liệu được kiểm tra; không thực thi JavaScript/CSS tùy ý từ file nhập. Version template được đóng băng trong quà đã gửi. Tháng một concept mới là đủ; không gắn nhãn “đang trend” nếu không có bằng chứng.

### P7 — Sao lưu và chuẩn bị gửi

- Preflight phân biệt lỗi chặn gửi và gợi ý: thiếu tên, URL lỗi, upload chưa xong, bản nháp, cảnh rỗng, dung lượng lớn.
- Xuất ZIP có manifest version + JSON + media cần thiết; báo file tải thất bại, không báo thành công giả.
- Nhập ZIP kiểm tra path traversal, tổng dung lượng giải nén, loại file và schema trước khi ghi; mặc định tạo bản mới tránh ghi đè.
- Nhân bản chọn giữ theme/nhạc; xóa shortName, tuổi, portrait và nội dung cá nhân theo lựa chọn.
- Xuất teaser Canvas là thử nghiệm riêng. Không hứa MP4 toàn bộ DOM/GSAP giống 100%; kiểm tra codec, âm thanh và hiệu năng trước khi đưa vào sản phẩm.

## 5. Thứ tự, thời gian và phụ thuộc

Ước lượng cho một người làm 6–10 giờ/tuần; tính theo thời gian thực tế sau mỗi đợt.

| Chặng | Ước lượng | Phụ thuộc | Điểm dừng có thể sử dụng |
|---|---|---|---|
| A: P0 + Studio P1 | 2–4 tuần | Kiểm tra checkout, backup | Studio mới dùng với dữ liệu v1 |
| B: P2 | 2–3 tuần | P0 | Tự sắp xếp câu chuyện |
| C: P3 + bộ theme cơ bản | 3–4 tuần | P2 | Album có cá tính |
| D: P4 | 2–3 tuần | Scene registry | Bốn tương tác hoàn chỉnh |
| E: P5 | 2–3 tuần | Audio transport ổn định | Biên tập âm thanh tại chỗ |
| F: P6 hoàn chỉnh + P7 | 2–3 tuần | Các module trước | Sao lưu và gửi quà thuận tiện |

Mỗi chặng thử một món quà thật; không đưa tất cả backlog vào một lần sửa. Ước lượng tổng mới 13–20 tuần bao gồm Studio và QA, thay thế ước lượng sơ bộ trước đó.

## 6. Kỹ thuật và dữ liệu

- Giữ React/TypeScript/GSAP và API hiện có; chưa cần chuyển framework.
- Thư viện Studio độc lập theme người nhận; CSS phạm vi Studio không đổi giao diện quà.
- Media có ID, loại, URL, kích thước và tham chiếu sử dụng; không xóa file đang được quà khác dùng.
- Migration thuần dữ liệu, có test fixture v1; backup trước khi thực hiện ghi lại dữ liệu thật.
- Tách trạng thái UI, draft chưa lưu và snapshot đã lưu. Hiển thị trạng thái xuất bản từ máy chủ.
- Private JSON và phân phối media là hai vấn đề khác nhau: private profile không tự làm URL ảnh public trở thành private.
- Không cần triển khai backend mới trong đợt thiết kế Studio.

## 7. Chất lượng và quy trình Git

Code trên `develop`; tạo commit theo thay đổi độc lập sau khi kiểm tra. Không tự merge main hoặc deploy production chỉ vì build pass. Tránh sửa `.data`, `.env.local`, credential và cấu hình production trong công việc giao diện.

Checklist mỗi đợt:

- [ ] Build/typecheck đạt; test hành vi liên quan đạt.
- [ ] Desktop 1280px và mobile 390px: không tràn ngang, nút không bị che.
- [ ] Keyboard, focus, nhãn input, thông báo lỗi và reduced motion.
- [ ] Loading, empty, lỗi API, hết session, thao tác đang chạy.
- [ ] Lưu/mở lại, preview, copy, publish và profile cũ.
- [ ] Console không có lỗi mới; ghi lại giới hạn chưa kiểm chứng.
- [ ] Không đưa dữ liệu mẫu vào tài khoản thật; kiểm thử với storage riêng.

## 8. Trạng thái thực hiện

Kế hoạch đã được người dùng chấp nhận về hướng đi. Đây là backlog, không có nghĩa các chức năng nâng cao đã được triển khai.

- [x] Lưu tài liệu chi tiết.
- [x] Tạo nhánh develop.
- [x] Hoàn thành thiết kế và triển khai Studio đợt đầu trên develop (chưa deploy).
- [ ] Nghiệm thu Studio, sau đó chọn chặng tiếp theo.

Đặc tả thiết kế hiện tại: [STUDIO-UX-DESIGN.md](STUDIO-UX-DESIGN.md).

### Kiểm chứng đợt Studio đầu

- `npm run build`, `npm run lint`, `npm test`: đạt; 36 tests hiện có đều qua.
- Kiểm tra trình duyệt với storage QA riêng: đăng nhập, tạo bản nháp với theme Pastel, sửa tên thân mật, chuyển mục, lưu và trở về thư viện thành công.
- Ảnh giao diện thực tế: [studio-preview.png](studio-preview.png).
- Chưa kiểm chứng đầy đủ mobile 390px, upload media, publish, clipboard và thay đổi trong lúc request lưu bị chậm. Các mục này còn trong danh sách nghiệm thu; kết quả tests hiện có không thay thế kiểm thử UI này.
- Không bổ sung dịch vụ trả phí hoặc dependency; dữ liệu thật không dùng cho thao tác QA.
