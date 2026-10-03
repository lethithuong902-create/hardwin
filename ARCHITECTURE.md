# Hardwin Business OS — Architecture

## Mục tiêu

Hardwin bắt đầu bằng một lõi B2B: giúp doanh nghiệp **đo lường → hiểu khách hàng → phát hiện vấn đề → tìm khách → đề xuất hành động → tạo nội dung → chuyển đổi thành doanh thu**.

MVP hiện tại dùng dữ liệu minh họa để kiểm thử trải nghiệm. Khi kết nối backend/database thật, mỗi doanh nghiệp sẽ có một workspace riêng.

## 1. Các lớp hệ thống

```
Web UI
  ↓
API / Auth
  ↓
Business Data Layer
  ├─ Workspaces / Members
  ├─ CRM / Leads / Customers
  ├─ Revenue / Expenses
  ├─ Tasks / Productivity
  ├─ Campaigns / Content
  ├─ Conversations / Messages
  └─ AI usage / Token wallet
  ↓
AI Router
  ├─ Gemini
  ├─ Groq
  └─ OpenRouter
  ↓
Business Agents
  ├─ Customer Analyst
  ├─ Growth Engine
  ├─ Finance Analyst
  ├─ Productivity Analyst
  └─ Content Assistant
```

## 2. Mô hình người dùng

### Cá nhân
- Chưa đăng ký: dùng thử giới hạn.
- Tài khoản miễn phí: dự kiến 30–35 tin AI/ngày.
- Token: mua thêm lượt dùng và mở tính năng/AI mạnh hơn.

### Doanh nghiệp
- Miễn phí: xem số liệu, phát hiện vấn đề và nhận đề xuất.
- Trả phí: phân tích sâu, tạo chiến dịch, tìm khách tiềm năng, quản lý nội dung và các hành động có phê duyệt.

## 3. Growth Engine — thu hút khách hàng

Mục tiêu không phải chỉ đưa ra báo cáo, mà giúp doanh nghiệp đi từ **“tôi cần khách” → “tôi biết khách nào cần mình” → “tôi có lời mời phù hợp” → “tôi có nội dung để thu hút” → “tôi thu được khách quan tâm” → “tôi ưu tiên người có khả năng mua”**.

Luồng MVP:

1. Xác định khách hàng mục tiêu.
2. Xác định vấn đề và giá trị doanh nghiệp có thể giải quyết.
3. Tạo offer/lời mời.
4. Tạo nội dung phù hợp từng kênh.
5. Thu thông tin khách quan tâm vào CRM.
6. Chấm điểm và ưu tiên lead.
7. Tạo bản nháp follow-up.
8. Chỉ gửi email/tin nhắn sau khi doanh nghiệp duyệt.

Trang MVP: `growth.html`.

## 4. Nguyên tắc tối ưu chi phí

1. Không gọi model lớn cho mọi việc.
2. Việc phân loại, tóm tắt, trích xuất số liệu → model nhỏ/rẻ.
3. Việc suy luận khó → model mạnh hơn nhưng có giới hạn ngân sách.
4. Cache các câu hỏi/kết quả có tính lặp lại.
5. Giới hạn context và output token.
6. Định tuyến theo loại tác vụ.
7. Theo dõi chi phí AI theo workspace và theo request.
8. Ưu tiên cloud; không yêu cầu tải model nặng về máy người dùng.

## 5. Dữ liệu Supabase

Project: `hardwin`.

Các bảng đã tạo:
- `workspaces`
- `workspace_members`
- `business_profiles`
- `customers`
- `leads`
- `campaigns`
- `campaign_assets`
- `outreach_events`
- `ai_daily_usage`
- `token_wallets`
- `token_ledger`
- `conversations`
- `messages`

Các bảng dữ liệu doanh nghiệp đều bật RLS để tách dữ liệu giữa các workspace. Quyền gửi liên hệ được thiết kế theo hướng **tạo bản nháp → doanh nghiệp duyệt → mới gửi**.

## 6. Lead scoring

Điểm lead nên là một hàm có thể giải thích được:

`score = need_fit + engagement + buying_signal + source_quality + recency`

Không dùng AI làm "hộp đen" duy nhất. AI có thể giải thích vì sao một lead được ưu tiên; hệ thống vẫn lưu các tín hiệu gốc.

## 7. Agent actions

Giai đoạn đầu AI **chỉ đề xuất và tạo bản nháp**.

Ví dụ:
- "Nên gọi khách A trước."
- "Khoản chi B tăng 24%."
- "Tạo chiến dịch C."
- "Soạn email cho nhóm khách D."

Khi xây automation thật, các hành động gửi email, nhắn tin, tạo đơn, hoàn tiền hoặc chi tiền phải đi qua quyền hạn, audit log và cơ chế phê duyệt.

## 8. Lộ trình

### MVP-1
Dashboard + CRM mẫu + chatbot + AI router. ✅

### MVP-2
Supabase database + cấu trúc workspace + nền tảng Auth. 🟡

### MVP-3
Dữ liệu thật + import CSV/Excel + kết nối nguồn dữ liệu bán hàng.

### MVP-4
Growth Engine + lead scoring + email/CRM automation có phê duyệt.

### MVP-5
Gói trả phí + token + thanh toán + báo cáo tự động.

### Sau khi lõi B2B có doanh thu
Mở rộng sang Creator, Media, Education, Entertainment, Games và các "ngôi nhà" khác của Hardwin.

## 9. Thước đo quan trọng

Không lấy số lượng tính năng làm KPI. Tập trung vào:
- số doanh nghiệp hoạt động hàng tuần
- thời gian từ đăng ký đến thấy giá trị đầu tiên
- số khách tiềm năng được tạo
- tỷ lệ lead được chuyển đổi
- doanh thu tạo ra trên mỗi workspace
- chi phí AI / doanh thu
- tỷ lệ người dùng quay lại
