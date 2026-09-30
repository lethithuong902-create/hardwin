export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    if (!messages.length) {
      return res.status(400).json({ error: "messages is required" });
    }

    const safeMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 6000)
    }));

    const context = JSON.stringify(body.context || {}).slice(0, 12000);

    const system = {
      role: "system",
      content: [
        "Bạn là Hardwin AI, trợ lý vận hành cho doanh nghiệp nhỏ và vừa.",
        "Mục tiêu: giúp doanh nghiệp hiểu khách hàng, doanh thu, chi phí, năng suất và tìm thử nghiệm tạo giá trị.",
        "Ưu tiên câu trả lời ngắn, có số liệu khi dữ liệu có sẵn, nêu giả định khi thiếu dữ liệu.",
        "Không tự nhận đã thực hiện giao dịch, gửi email, gọi khách, thay đổi dữ liệu hoặc chi tiền nếu chưa có công cụ/ủy quyền thật.",
        "Không bịa số liệu. Khi dữ liệu là mẫu, nói rõ đó là dữ liệu mẫu.",
        "Ngữ cảnh workspace hiện tại: " + context
      ].join("\n")
    };

    const provider = (process.env.AI_PROVIDER || "openrouter").toLowerCase();

    if (provider === "ollama") {
      const base = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
      const model = process.env.AI_MODEL || "llama3.2";
      return await callOpenAICompatible(base, process.env.OLLAMA_API_KEY || "ollama", model, [system, ...safeMessages], res);
    }

    if (provider === "groq") {
      const base = "https://api.groq.com/openai/v1";
      const model = process.env.AI_MODEL || "openai/gpt-oss-20b";
      return await callOpenAICompatible(base, process.env.GROQ_API_KEY, model, [system, ...safeMessages], res);
    }

    const base = "https://openrouter.ai/api/v1";
    const model = process.env.AI_MODEL || "openrouter/free";
    return await callOpenAICompatible(base, process.env.OPENROUTER_API_KEY, model, [system, ...safeMessages], res, {
      "HTTP-Referer": process.env.APP_URL || "https://github.com/lethithuong902-create/hardwin",
      "X-Title": "Hardwin Business OS"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "AI service failed" });
  }
}

async function callOpenAICompatible(baseUrl, apiKey, model, messages, res, extraHeaders = {}) {
  if (!apiKey) {
    return res.status(503).json({ error: "AI provider key is not configured" });
  }

  const response = await fetch(baseUrl.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey,
      ...extraHeaders
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 700
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Provider error", response.status, data);
    return res.status(502).json({ error: "AI provider error" });
  }

  const reply = data?.choices?.[0]?.message?.content || "Không nhận được phản hồi từ model.";
  return res.status(200).json({ reply, provider: baseUrl, model });
}