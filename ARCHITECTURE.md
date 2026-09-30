# Hardwin Business OS — Architecture

## Mục tiêu

Hardwin bắt đầu bằng một lõi B2B: giúp doanh nghiệp **đo lường → hiểu khách hàng → phát hiện vấn đề → đề xuất hành động → tạo nội dung/tài liệu → chuyển đổi thành doanh thu**.

MVP hiện tại dùng dữ liệu minh họa để kiểm thử trải nghiệm. Khi kết nối backend/database thật, mỗi doanh nghiệp sẽ có một workspace riêng.

## 1. Các lớp hệ thống

```
Web UI
  ↓
API / Auth
  ↓
Business Data Layer
  ├─ CRM / Leads
  ├─ Revenue / Expenses
  ├─ Tasks / Productivity
  └─ Content / Materials
  ↓
AI Router
  ├─ OpenRouter (prototype / free routing)
  ├─ Groq (fast hosted open-weight models)
  └─ Ollama / vLLM (self-hosted)
  ↓
Business Agents
  ├─ Customer Analyst
  ├─ Finance Analyst
  ├─ Productivity Analyst
  └─ Content Assistant
```

## 2. Nguyên tắc tối ưu chi phí

1. Không gọi model lớn cho mọi việc.
2. Việc phân loại, tóm tắt, trích xuất số liệu → model nhỏ/rẻ hoặc local.
3. Việc suy luận khó → model mạnh hơn nhưng có giới hạn ngân sách.
4. Cache các câu hỏi/kết quả có tính lặp lại.
5. Giới hạn context và output token.
6. Định tuyến theo loại tác vụ.
7. Theo dõi chi phí AI theo workspace và theo request.
8. Khi có đủ lưu lượng, chuyển tác vụ ổn định sang self-hosted Ollama/vLLM.

## 3. AI Router

API `/api/chat` hiện hỗ trợ ba chế độ bằng biến môi trường:

- `AI_PROVIDER=openrouter`
- `AI_PROVIDER=groq`
- `AI_PROVIDER=ollama`

Model được cấu hình bằng `AI_MODEL`. API key chỉ được đặt trong server environment.

## 4. Dữ liệu doanh nghiệp

Các bảng lõi nên có:

- `workspaces`
- `users`
- `customers`
- `leads`
- `conversations`
- `deals`
- `transactions`
- `expenses`
- `tasks`
- `content_assets`
- `ai_usage`

Mỗi record cần có `workspace_id` để tách dữ liệu giữa các doanh nghiệp.

## 5. Lead scoring

Điểm lead nên là một hàm có thể giải thích được:

`score = need_fit + engagement + buying_signal + source_quality + recency`

Không dùng AI làm "hộp đen" duy nhất. AI có thể giải thích vì sao một lead được ưu tiên; hệ thống vẫn lưu các tín hiệu gốc.

## 6. Agent actions

Giai đoạn đầu AI **chỉ đề xuất**.

Ví dụ:
- "Nên gọi khách A trước."
- "Khoản chi B tăng 24%."
- "Hãy thử chiến dịch C."

Khi xây automation thật, các hành động gửi email, nhắn tin, tạo đơn, hoàn tiền hoặc chi tiền phải đi qua quyền hạn, audit log và cơ chế phê duyệt.

## 7. Lộ trình

### MVP-1
Dashboard + CRM mẫu + chatbot + AI router.

### MVP-2
Đăng ký/đăng nhập + workspace doanh nghiệp + database thật.

### MVP-3
Import CSV/Excel + kết nối Google Sheets + đồng bộ dữ liệu bán hàng.

### MVP-4
Lead scoring thật + email/CRM automation có phê duyệt.

### MVP-5
AI analyst + báo cáo tự động + sản phẩm/dịch vụ trả phí.

### Sau khi lõi B2B có doanh thu
Mở rộng sang Creator, Media, Education, Entertainment, Games và các "ngôi nhà" khác của Hardwin.

## 8. Thước đo quan trọng

Không lấy số lượng tính năng làm KPI. Tập trung vào:

- số doanh nghiệp hoạt động hàng tuần
- thời gian từ đăng ký đến thấy giá trị đầu tiên
- số vấn đề được phát hiện và xử lý
- tỷ lệ lead được chuyển đổi
- doanh thu tạo ra trên mỗi workspace
- chi phí AI / doanh thu
- tỷ lệ người dùng quay lại
