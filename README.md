# Hardwin

Hardwin đang được xây dựng theo hướng **hệ sinh thái số bắt đầu từ B2B**.

## Hardwin Business OS

MVP đầu tiên tập trung vào:

- Dashboard doanh thu, chi phí và năng suất
- CRM và lead scoring
- Phát hiện cơ hội
- Trợ lý AI cho doanh nghiệp
- AI Router để đổi giữa OpenRouter, Groq và Ollama/vLLM
- Kiến trúc mở rộng dần sang nội dung, creator, giải trí và nền tảng

Mở MVP tại [Business OS](./business.html).

## AI environment

Prototype hỗ trợ:

```text
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=...
AI_MODEL=openrouter/free
```

Hoặc:

```text
AI_PROVIDER=groq
GROQ_API_KEY=...
AI_MODEL=openai/gpt-oss-20b
```

Hoặc local:

```text
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.2
```

**Không commit API key vào GitHub.** Hãy dùng biến môi trường của nền tảng deploy.

Xem kiến trúc tại [ARCHITECTURE.md](./ARCHITECTURE.md).
