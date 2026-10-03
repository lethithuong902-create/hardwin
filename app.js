const STORAGE_KEY = "hardwin_home_chat_v1";
const MAX_MESSAGES = 40;
const MAX_CHARS = 4000;
const CLIENT_LIMIT = 12;

const messagesEl = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const statusText = document.getElementById("statusText");
const suggestions = document.getElementById("suggestions");
const newChatBtn = document.getElementById("newChatBtn");

let history = loadHistory();
let busy = false;
let timestamps = [];

function loadHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(item =>
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
      )
      .slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_MESSAGES)));
  } catch {}
}

function addMessage(content, role) {
  const row = document.createElement("div");
  row.className = "message-row " + role;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = content;

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return bubble;
}

function render() {
  messagesEl.innerHTML = "";
  if (!history.length) return;

  for (const item of history) {
    addMessage(item.content, item.role);
  }
}

function setStatus(text, error = false) {
  statusText.textContent = text;
  statusText.classList.toggle("error", error);
}

function autoResize() {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 180) + "px";
}

function rateAllowed() {
  const now = Date.now();
  timestamps = timestamps.filter(t => now - t < 60000);
  if (timestamps.length >= CLIENT_LIMIT) return false;
  timestamps.push(now);
  return true;
}

function newChat() {
  history = [];
  localStorage.removeItem(STORAGE_KEY);
  render();
  setStatus("AI cloud • sẵn sàng");
  chatInput.focus();
}

async function readStream(response, pending) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Trình duyệt không hỗ trợ phản hồi streaming.");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const dataLine = event.split("\n").find(line => line.startsWith("data:"));
      if (!dataLine) continue;

      let payload;
      try {
        payload = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }

      if (payload.type === "meta") {
        setStatus((payload.provider || "AI") + " • " + (payload.model || "cloud"));
      } else if (payload.type === "delta") {
        pending.textContent += payload.text || "";
        messagesEl.scrollTop = messagesEl.scrollHeight;
      } else if (payload.type === "error") {
        throw new Error(payload.error || "AI không phản hồi.");
      }
    }
  }
}

suggestions?.addEventListener("click", event => {
  const button = event.target.closest("[data-prompt]");
  if (!button || busy) return;
  chatInput.value = button.dataset.prompt || "";
  autoResize();
  chatInput.focus();
});

newChatBtn?.addEventListener("click", newChat);

chatInput?.addEventListener("input", autoResize);

chatInput?.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

chatForm?.addEventListener("submit", async event => {
  event.preventDefault();
  if (busy) return;

  const text = chatInput.value.trim();
  if (!text) return;
  if (text.length > MAX_CHARS) {
    setStatus("Tin nhắn quá dài.", true);
    return;
  }
  if (!rateAllowed()) {
    setStatus("Bạn đang gửi quá nhanh. Hãy thử lại sau một lúc.", true);
    return;
  }

  busy = true;
  sendBtn.disabled = true;
  suggestions?.querySelectorAll("button").forEach(button => button.disabled = true);

  addMessage(text, "user");
  history.push({ role: "user", content: text });
  saveHistory();

  chatInput.value = "";
  autoResize();

  const pending = addMessage("", "assistant");
  setStatus("Hardwin AI đang suy nghĩ…");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
      },
      body: JSON.stringify({
        stream: true,
        messages: history
      })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const providerMessage = Array.isArray(data.providers) && data.providers.length
        ? " | " + data.providers.join(" | ")
        : "";
      throw new Error((data.error || ("HTTP " + response.status)) + providerMessage);
    }

    await readStream(response, pending);

    if (!pending.textContent.trim()) {
      throw new Error("AI không trả về nội dung.");
    }

    history.push({ role: "assistant", content: pending.textContent });
    saveHistory();
    setStatus("AI cloud • sẵn sàng");
  } catch (error) {
    pending.textContent = "Chưa thể kết nối AI: " + (error.message || "lỗi không xác định");
    setStatus("AI chưa sẵn sàng — kiểm tra cấu hình máy chủ.", true);
  } finally {
    busy = false;
    sendBtn.disabled = false;
    suggestions?.querySelectorAll("button").forEach(button => button.disabled = false);
    chatInput.focus();
  }
});

document.getElementById("year").textContent = new Date().getFullYear();
render();
autoResize();