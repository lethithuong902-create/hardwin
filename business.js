const leads=[
{name:"Minh Phát Media",source:"Website",need:"Quản lý khách hàng",score:94,status:"Nóng"},
{name:"An Nhiên Shop",source:"Facebook",need:"Tối ưu chi phí",score:87,status:"Nóng"},
{name:"VietHome",source:"Referral",need:"Tăng lead",score:79,status:"Ấm"},
{name:"Nova Academy",source:"Chatbot",need:"Nội dung AI",score:71,status:"Ấm"},
{name:"Bắc Việt Food",source:"Google",need:"Dashboard",score:62,status:"Ấm"},
{name:"Gia Bảo Studio",source:"TikTok",need:"Livestream",score:48,status:"Lạnh"},
{name:"Green Farm",source:"Website",need:"CRM",score:43,status:"Lạnh"}
];

function renderLeads(data=leads){
  const cls={Nóng:"hot",Ấm:"warm",Lạnh:"cold"};
  document.getElementById("leadTable").innerHTML=data.map(l=>`<tr><td><span class="lead-name">${l.name}</span></td><td>${l.source}</td><td>${l.need}</td><td class="lead-score">${l.score}</td><td><span class="pill ${cls[l.status]}">${l.status.toUpperCase()}</span></td></tr>`).join("");
}
renderLeads();

document.getElementById("sortLeadBtn")?.addEventListener("click",()=>renderLeads([...leads].sort((a,b)=>b.score-a.score)));

const insights=[
["Gọi 2 khách hàng nóng trước 11:00","Minh Phát Media và An Nhiên Shop có điểm nhu cầu cao; đề xuất ưu tiên follow-up."],
["Cắt một nhóm chi phí lặp lại","Chi phí vận hành đang chiếm khoảng 30% doanh thu mẫu; nên rà soát các công cụ ít sử dụng."],
["Tái sử dụng nội dung đang có","Một nội dung tốt có thể biến thành bài viết, short video, email và script livestream."],
["Đặt mục tiêu cho chatbot","Theo dõi câu hỏi của khách để phát hiện nhu cầu mới trước khi xây sản phẩm."]
];
document.getElementById("insightList").innerHTML=insights.map(x=>`<div class="insight"><strong>${x[0]}</strong><span>${x[1]}</span></div>`).join("");

const bars=[72,86,64,92,78,96,88];
document.getElementById("chartBars").innerHTML=bars.map(v=>`<div class="bar-group"><i class="bar revenue-bar" style="height:${v}%"></i><i class="bar cost-bar" style="height:${Math.max(16,v*.55)}%"></i></div>`).join("");

document.getElementById("refreshBtn")?.addEventListener("click",()=>{
  const now=new Date();
  document.getElementById("updatedAt").textContent="Cập nhật: "+now.toLocaleString("vi-VN");
});

document.getElementById("exportBtn")?.addEventListener("click",()=>{
  const report={revenue:"₫420M",hotLeads:34,conversion:"8.6%",operatingCost:"₫126M",productivity:78,leads};
  const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=url;a.download="hardwin-business-report.json";a.click();URL.revokeObjectURL(url);
});

const chatMessages=document.getElementById("chatMessages");
const chatForm=document.getElementById("chatForm");
const chatInput=document.getElementById("chatInput");

function addMessage(text,role){
  const el=document.createElement("div");el.className=`bubble ${role}`;el.textContent=text;chatMessages.appendChild(el);chatMessages.scrollTop=chatMessages.scrollHeight;
}
function localAnswer(q){
  const s=q.toLowerCase();
  if(s.includes("chi")||s.includes("cost")) return "MVP đang cho thấy chi phí vận hành mẫu là ₫126M. Bước tiếp theo là nhập dữ liệu chi phí thật, nhóm theo mục đích và tính tỷ lệ chi phí trên doanh thu để tìm khoản cần tối ưu.";
  if(s.includes("khách")||s.includes("lead")) return "Hai lead mẫu nên được ưu tiên là Minh Phát Media (94) và An Nhiên Shop (87). Khi kết nối CRM thật, Hardwin sẽ tính điểm theo nhu cầu, hành vi, nguồn và mức độ tương tác.";
  if(s.includes("tăng doanh thu")||s.includes("ý tưởng")) return "Ba thử nghiệm: (1) bán gói triển khai AI cho khách hiện tại, (2) tạo sản phẩm số từ nhu cầu lặp lại trong chatbot, (3) xây nội dung thu lead rồi tự động phân loại trước khi nhân viên gọi.";
  return "Mình có thể phân tích khách hàng, chi phí, năng suất hoặc đề xuất thử nghiệm tăng trưởng. Với dữ liệu thật, câu trả lời sẽ dựa trên workspace của doanh nghiệp thay vì dữ liệu mẫu.";
}

chatForm?.addEventListener("submit",async(e)=>{
  e.preventDefault();const q=chatInput.value.trim();if(!q)return;
  addMessage(q,"user");chatInput.value="";
  const pending=document.createElement("div");pending.className="bubble bot";pending.textContent="Đang phân tích…";chatMessages.appendChild(pending);
  try{
    const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:q}],context:{workspace:"demo-business",leads}})});
    if(!res.ok) throw new Error("API unavailable");
    const data=await res.json();pending.textContent=data.reply||localAnswer(q);
  }catch(err){pending.textContent=localAnswer(q);}
  chatMessages.scrollTop=chatMessages.scrollHeight;
});

document.getElementById("updatedAt").textContent="MVP dữ liệu minh họa";