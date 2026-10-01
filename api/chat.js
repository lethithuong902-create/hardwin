const PROVIDER_ORDER = ["gemini", "groq", "openrouter"];

// Keep this router free-only for the MVP.
// It never intentionally selects a paid model.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
    if (!messages.length) {
      return res.status(400).json({ error: "messages is required" });
    }

    const safeMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 4000)
    }));

    const context = JSON.stringify(body.context || {}).slice(0, 8000);

    const system = {
      role: "system",
      content: [
        "Bạn là Hardwin AI, trợ lý vận hành cho doanh nghiệp nhỏ và vừa.",
        "Mục tiêu: giúp doanh nghiệp hiểu khách hàng, doanh thu, chi phí, năng suất và tìm thử nghiệm tạo giá trị.",
        "Trả lời tiếng Việt, tự nhiên, ngắn gọn nhưng đủ ý.",
        "Ưu tiên dữ liệu đã được cung cấp; không bịa số liệu.",
        "Nếu dữ liệu là mẫu, nói rõ đó là dữ liệu mẫu.",
        "Ngữ cảnh workspace hiện tại: " + context
      ].join("\n")
    };

    const preferred = (process.env.AI_PROVIDER || "auto").toLowerCase();
    const order = preferred === "auto"
      ? PROVIDER_ORDER
      : [preferred, ...PROVIDER_ORDER.filter((p) => p !== preferred)];

    const errors = [];

    for (const provider of order) {
      try {
        if (provider === "gemini" && process.env.GEMINI_API_KEY) {
          const result = await callGemini(
            process.env.GEMINI_API_KEY,
            process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
            [system, ...safeMessages]
          );
          return res.status(200).json({ reply: result.reply, provider: "gemini", model: result.model });
        }

        if (provider === "groq" && process.env.GROQ_API_KEY) {
          const result = await callOpenAICompatible(
            "https://api.groq.com/openai/v1",
            process.env.GROQ_API_KEY,
            process.env.GROQ_MODEL || "openai/gpt-oss-20b",
            [system, ...safeMessages]
          );
          return res.status(200).json({ reply: result.reply, provider: "groq", model: result.model });
        }

        if (provider === "openrouter" && process.env.OPENROUTER_API_KEY) {
          const result = await callOpenAICompatible(
            "https://openrouter.ai/api/v1",
            process.env.OPENROUTER_API_KEY,
            process.env.OPENROUTER_MODEL || "openrouter/free",
            [system, ...safeMessages],
            {
              "HTTP-Referer": process.env.APP_URL || "https://github.com/lethithuong902-create/hardwin",
              "X-Title": "Hardwin Business OS"
            }
          );
          return res.status(200).json({ reply: result.reply, provider: "openrouter", model: result.model });
        }

        errors.push(provider + ": not configured");
      } catch (error) {
        errors.push(provider + ": " + error.message);
      }
    }

    console.error("All free AI providers failed", errors);
    return res.status(503).json({
      error: "Tất cả nguồn AI miễn phí hiện không khả dụng.",
      providers: errors
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "AI service failed" });
  }
}

async function callOpenAICompatible(baseUrl, apiKey, model, messages, extraHeaders = {}) {
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
    const retryAfter = response.headers.get("retry-after");
    const suffix = retryAfter ? " retry-after=" + retryAfter : "";
    throw new Error("HTTP " + response.status + suffix);
  }

  return {
    reply: data?.choices?.[0]?.message?.content || "Không nhận được phản hồi từ model.",
    model
  };
}

async function callGemini(apiKey, model, messages) {
  const systemText = messages.find((m) => m.role === "system")?.content || "";
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "") }]
    }));

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" + encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 700
        }
      })
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const suffix = retryAfter ? " retry-after=" + retryAfter : "";
    throw new Error("HTTP " + response.status + suffix);
  }

  return {
    reply: data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() ||
      "Không nhận được phản hồi từ model.",
    model
  };
}
