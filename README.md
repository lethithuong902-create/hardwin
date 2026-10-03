# Hardwin

Hardwin đang được xây dựng theo hướng **hệ sinh thái số bắt đầu từ B2B**.

## Hardwin Business OS

MVP tập trung vào:
- Dashboard doanh thu, chi phí và năng suất
- CRM và lead scoring
- Growth Engine để xác định khách hàng mục tiêu và tạo kế hoạch thu hút khách
- Trợ lý AI trên cloud
- Auth + Workspace + Database bằng Supabase

Mở tại [Business OS](./business.html).

## Supabase

Project hiện tại: `hardwin`.

Hardwin dùng:
- Supabase Auth
- PostgreSQL
- Row Level Security (RLS)
- Workspace và workspace members
- Dữ liệu khách hàng/lead/campaign
- Lịch sử chat và usage/token

### Biến môi trường

Không commit khóa vào GitHub.

Trên Vercel, thêm:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
```

Có thể dùng publishable key mới thay cho legacy anon key:

```text
SUPABASE_PUBLISHABLE_KEY=...
```

Các biến AI tiếp tục đặt trên Vercel:

```text
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
```

Frontend lấy cấu hình Supabase từ `/api/supabase-config`, vì vậy không có khóa bí mật nào được ghi trực tiếp trong HTML/JS.

## Đăng nhập

Trang [login.html](./login.html):
- Google OAuth là lựa chọn chính
- Email + mật khẩu là lựa chọn phụ

Sau khi đăng nhập, Hardwin đưa người dùng tới [onboarding.html](./onboarding.html):
1. Chọn workspace có sẵn hoặc tạo workspace mới.
2. Nếu chưa có workspace nào thì bắt buộc tạo workspace đầu tiên.
3. Workspace đang dùng được lưu bằng `hardwin_current_workspace_id`.
4. Business OS chỉ tải dữ liệu của workspace hiện tại.

## Dữ liệu mẫu

Khi workspace chưa có lead hoặc số liệu thật, Business OS vẫn hiển thị dữ liệu mẫu để người dùng thử giao diện. Khi có dữ liệu thật, Hardwin ưu tiên dữ liệu của workspace.

## Growth Engine

Trang [growth.html](./growth.html) giúp doanh nghiệp:
1. Xác định khách hàng mục tiêu.
2. Xác định vấn đề của khách.
3. Tạo lời mời/offer.
4. Tạo ý tưởng nội dung.
5. Chuẩn bị cách thu khách quan tâm.
6. Lập kế hoạch follow-up.

Giai đoạn đầu Hardwin chỉ tạo đề xuất/bản nháp. Những hành động liên hệ thật cần được doanh nghiệp duyệt.

## Triển khai

`vercel.json` giữ cấu hình static/clean URLs. Vercel cần có các biến môi trường bên trên trong Project Settings → Environment Variables.

Xem [ARCHITECTURE.md](./ARCHITECTURE.md) và [supabase/schema.md](./supabase/schema.md).
