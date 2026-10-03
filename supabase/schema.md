# Hardwin Supabase — schema reference

Project ref: hhxjfgxkxxbqjxoklfmi

Schema đã được áp dụng trực tiếp trên Supabase project. File này là bản tham khảo để team biết cấu trúc dữ liệu và bảo mật.

Các bảng chính:
- profiles
- workspaces
- workspace_members
- business_profiles
- customers
- leads
- campaigns
- campaign_assets
- outreach_events
- ai_daily_usage
- token_wallets
- token_ledger
- conversations
- messages

Bảo mật:
- Các bảng đều bật Row Level Security.
- profiles chỉ cho chính user xem/sửa.
- workspaces chỉ cho owner/member của workspace truy cập.
- Dữ liệu workspace dùng helper private.is_workspace_member(...) để tránh vòng lặp RLS.
- Tạo workspace sẽ tự thêm owner vào workspace_members.
- Gửi liên hệ được thiết kế theo luồng bản nháp → duyệt → gửi.
