const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const toolResult = document.getElementById("toolResult");
const newsletterForm = document.getElementById("newsletterForm");
const formMessage = document.getElementById("formMessage");

menuToggle?.addEventListener("click", () => {
  navLinks.style.display = navLinks.style.display === "flex" ? "" : "flex";
});

const toolMessages = {
  idea: "Ví dụ: Vấn đề = “creator khó duy trì nội dung”. 10 hướng thử nghiệm có thể gồm: lịch nội dung, tái chế video, thư viện hook, trợ lý AI, dashboard KPI…",
  content: "Lịch mẫu 7 ngày: Thứ 2 — vấn đề khách hàng; Thứ 3 — case study; Thứ 4 — video hướng dẫn; Thứ 5 — hậu trường; Thứ 6 — livestream; Thứ 7 — tài nguyên miễn phí; Chủ nhật — tổng kết + CTA.",
  value: "Công thức: Nhóm người cụ thể → nỗi đau có chi phí → giải pháp đo được → cách phân phối → cách thu tiền. Hãy bắt đầu bằng một vấn đề nhỏ nhưng lặp lại thường xuyên."
};

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.tool;
    toolResult.textContent = toolMessages[key] || "Đang cập nhật công cụ.";
  });
});

newsletterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("emailInput").value.trim();
  if (!email) return;
  localStorage.setItem("hardwin_subscriber", email);
  formMessage.textContent = "Đã ghi nhận email trên thiết bị này. Khi nối backend, danh sách này sẽ được chuyển sang hệ thống email thật.";
  newsletterForm.reset();
});

document.getElementById("year").textContent = new Date().getFullYear();
