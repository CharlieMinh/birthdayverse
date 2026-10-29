# BirthdayVerse Studio — Đặc tả UX/UI

Ngày: 29/10/2026. Hướng: Creative atelier. Nhánh: develop.

## Vấn đề từ ảnh và mã nguồn

Thư viện hiện tại có khoảng trống lớn, avatar nhỏ không biểu đạt phong cách. Bốn thao tác ngang nhau làm nút xóa nổi tương đương nút sửa. Tạo trang chỉ hỏi tên; người mới không hình dung món quà sẽ trông như thế nào. Editor là form dài tám phần, khó tập trung và thiếu tổng quan trong lúc chỉnh.

## Mục tiêu

Tạo cảm giác một bàn làm quà; rõ ràng, ấm áp, giàu hình ảnh nhưng không lấn át nội dung. Làm nổi thao tác tiếp tục chỉnh sửa. Mẫu giao diện phải dùng dữ liệu thật và các theme thực sự hỗ trợ. Các chức năng roadmap chưa xây không được hiển thị như đã hoạt động.

## Visual direction

- Nền giấy #f6f3ed; panel trắng ấm; mực tím #292438.
- Accent san hô #b84b3e; lavender và vàng nhạt cho minh họa.
- Sans-serif cho thao tác/field; serif cho tiêu đề mang cảm xúc.
- Nhịp khoảng cách 8px; card radius 20–28px; border nhẹ; shadow tiết chế.
- Minh họa tự vẽ bằng CSS: phong bì, con dấu và ngôi sao. Không yêu cầu ảnh trả phí.
- Studio sáng và ổn định; preview mỗi món quà mang theme riêng.

## Thư viện

Header logo + tên Studio + đăng xuất. Hero có thông điệp “Một chút sáng tạo. Một người thật đặc biệt.” và CTA Tạo món quà. Minh họa phong bì ở cột còn lại. Dưới hero là thư viện với số lượng thực, search tên và bộ lọc tất cả/nháp/đã xuất bản. Card có cover theo theme, portrait nếu có, tên, số ảnh/voice, trạng thái, thời gian cập nhật. CTA chính Tiếp tục thiết kế; thao tác copy/nhân bản/xóa nhỏ hơn. Xóa luôn có xác nhận nêu rõ đối tượng.

Empty state có hướng dẫn tạo quà đầu tiên; no-results có cách xóa bộ lọc; lỗi tải danh sách có thử lại. Không dùng dữ liệu mẫu để lấp khoảng trống của tài khoản thật.

## Luồng tạo

Một màn riêng trong Studio: Quay lại → tên người nhận (bắt buộc) → chọn một trong năm theme → preview bìa cập nhật theo tên/theme → Tạo bản nháp. Người dùng có thể đổi theme về sau. Giữ tên và theme nếu lỗi. Disable submit khi đang tạo. Nếu tạo hồ sơ thành công nhưng save theme thất bại, giữ slug và thử lại trên cùng hồ sơ để tránh tạo nhiều trang rác.

Không gọi ba kịch bản roadmap là lựa chọn hoạt động. Chỉ hiển thị năm theme hiện có.

## Editor

Toolbar cố định chứa về thư viện, tên, trạng thái lưu, Xem thử và Lưu. Thanh mục bên trái đánh số tám phần; một phần nội dung ở giữa; bên phải cover tĩnh và tóm tắt số ảnh/voice/theme. Cần nhãn “Bìa minh họa”; animation thật xem qua Xem thử. Các phần nội dung giữ mounted khi đổi tab để không mất state transcript chưa chuyển thành phụ đề.

Trạng thái xuất bản dựa trên snapshot đã lưu. Copy link không tự publish. Bản nháp có giải thích ngắn gọn, xuất bản là hành động riêng. Khi đang upload/saving không cho bắt đầu request publish cạnh tranh. Quay lại thư viện khi dirty cần xác nhận.

## Responsive và accessibility

Desktop ≥1100px: sidebar / form / summary. Tablet: sidebar nhỏ + form, summary đưa xuống. Mobile <760px: một cột, nav ngang, header gọn, nút ≥44px. Form không có chiều cao cố định; preview không che field. Dùng semantic buttons/labels, aria-current cho mục đang chọn, aria-live cho save/error. Focus rõ, không chỉ dùng màu để phân biệt trạng thái. Không tự phát audio trong Studio.

## Phạm vi đợt thiết kế này

Triển khai thư viện mới, tìm/lọc, màn tạo với chọn theme, cover minh họa, editor theo mục và nhận diện sáng riêng cho Studio. Dùng API hiện có. Kịch bản linh hoạt, undo/redo, IndexedDB, AI, export video và bốn cảnh mới thuộc roadmap riêng.

## Nghiệm thu

- Tên rỗng không tạo; theme chọn được lưu và xuất hiện khi mở editor.
- Search + filter kết hợp đúng; lỗi có thử lại; ngày không hợp lệ không crash.
- Đổi mục không làm mất state; preview mở bản đã lưu hoặc báo lỗi lưu.
- Không tự public trang khi copy; cancel xóa không thay dữ liệu.
- Kiểm tra 390px và 1280px; build/lint/test; ghi rõ những kiểm tra browser chưa chạy được.
# Thông báo và xác nhận thao tác

- Placeholder tên người nhận dùng “Minh”; không thay dữ liệu người dùng đã nhập.
- Toast cố định góc dưới, có nút đóng và vùng `aria-live` để thông báo lưu, sao chép link, trạng thái xuất bản và lỗi thao tác. Thông báo được giữ đến khi người dùng đóng hoặc có thông báo mới.
- Dialog đồng bộ nền giấy/lavender cho nhân bản, xóa, xuất bản, chuyển bản nháp và rời editor chưa lưu. Xóa và bỏ thay đổi có nội dung cảnh báo rõ; focus mặc định ở nút quay lại.
- Native `<dialog>` giữ focus trong hộp thoại, hỗ trợ Escape và khôi phục focus về nút mở. Cảnh báo đóng/reload tab vẫn do trình duyệt quản lý.
- Khi clipboard không khả dụng, dialog hiện link chỉ đọc để sao chép thủ công.
- Kiểm tra 29/10/2026: build, lint và 36 tests đạt. Trình duyệt đã xác nhận mở/hủy nhân bản, Escape phục hồi focus, toast bản nháp và mở/hủy xóa. Không xóa hoặc xuất bản dữ liệu thật trong QA.

