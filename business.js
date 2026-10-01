const leads=[
{name:"Minh Phát Media",source:"Website",need:"Quản lý khách hàng",score:94,status:"Nóng"},
{name:"An Nhiên Shop",source:"Facebook",need:"Tối ưu chi phí",score:87,status:"Nóng"},
{name:"VietHome",source:"Referral",need:"Tăng lead",score:79,status:"Ấm"},
{name:"Nova Academy",source:"Chatbot",need:"Nội dung AI",score:71,status:"Ấm"},
{name:"Bắc Việt Food",source:"Google",need:"Dashboard",score:62,status:"Ấm"},
{name:"Gia Bảo Studio",source:"TikTok",need:"Livestream",score:48,status:"Lạnh"},
{name:"Green Farm",source:"Website",need:"CRM",score:43,status:"Lạnh"}
];

const businessSnapshot={
  revenue_month:"₫420M",
  revenue_change:"+12.8%",
  operating_cost:"₫126M",
  cost_change:"-6.2%",
  conversion:"8.6%",
  interested_customers:"476",
  converted_customers:"41",
  productivity_score:78,
  tasks_completed:"86%",
  tasks_on_time:"81%",
  wasted_time:"11%",
  leads,
  insights:[
    "Ưu tiên follow-up Minh Phát Media và An Nhiên Shop.",
    "Rà soát các công cụ có chi phí lặp lại nhưng ít sử dụng.",
    "Tái sử dụng nội dung tốt thành bài viết, short video, email và script livestream.",
    "Theo dõi câu hỏi của khách để phát hiện nhu cầu mới."
  ]
};

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
  const report={...businessSnapshot,exported_at:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=url;a.download="hardwin-business-report.json";a.click();URL.revokeObjectURL(url);
});

const chatMessages=document.getElementById("chatMessages");
const chatForm=document.getElementById("chatForm");
const chatInput=document.getElementById("chatInput");
const sendChatBtn=document.getElementById("sendChatBtn");
const inputCounter=document.getElementById("inputCounter");
const usageStatus=document.getElementById("usageStatus");
const chatProviderStatus=document.getElementById("chatProviderStatus");
const cloudAiStatusText=document.getElementById("cloudAiStatusText");
const quickPrompts=document.getElementById("quickPrompts");

const CHAT_STORAGE_KEY="hardwin_chat_history_v2";
const CHAT_META_KEY="hardwin_chat_meta_v2";
const MAX_STORED_MESSAGES=60;
const MAX_MESSAGE_CHARS=4000;
const CLIENT_MAX_PER_MINUTE=12;

let requestTimestamps=[];
let isStreaming=false;

function loadChatHistory(){
  try{
    const parsed=JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)||"[]");
    if(!Array.isArray(parsed)) return [];
    return parsed.filter(m=>
      m && (m.role==="user"||m.role==="assistant") && typeof m.content==="string"
    ).slice(-MAX_STORED_MESSAGES);
  }catch(err){return [];}
}
const chatHistory=loadChatHistory();

function saveChatHistory(){
  try{
    localStorage.setItem(CHAT_STORAGE_KEY,JSON.stringify(chatHistory.slice(-MAX_STORED_MESSAGES)));
  }catch(err){
    setCloudAiStatus("Không thể lưu lịch sử trên trình duyệt.");
  }
}

function updateUsage(){
  const users=chatHistory.filter(m=>m.role==="user").length;
  if(usageStatus) usageStatus.textContent=users+" lượt";
}

function setCloudAiStatus(message){
  if(cloudAiStatusText) cloudAiStatusText.textContent=message;
}

function setProviderStatus(provider,model,extra=""){
  if(chatProviderStatus){
    chatProviderStatus.textContent=(provider?provider+" • ":"")+"cloud"+(model?" • "+model:"")+(extra?" • "+extra:"");
  }
  if(cloudAiStatusText && provider){
    cloudAiStatusText.textContent="Đang dùng "+provider+(model?" / "+model:"")+" trên cloud. Máy bạn không tải model.";
  }
}

function addMessage(text,role){
  const el=document.createElement("div");
  el.className=`bubble ${role}`;
  el.textContent=text;
  chatMessages.appendChild(el);
  chatMessages.scrollTop=chatMessages.scrollHeight;
  return el;
}

function renderStoredChatHistory(){
  chatMessages.innerHTML="";
  if(!chatHistory.length){
    addMessage("Xin chào. Tôi là Hardwin AI. Hãy thử một câu hỏi nhanh bên trên hoặc hỏi trực tiếp về doanh thu, chi phí, khách hàng, năng suất và cơ hội tăng trưởng.","bot");
  }else{
    chatHistory.forEach(m=>addMessage(m.content,m.role==="assistant"?"bot":"user"));
  }
  updateUsage();
}
renderStoredChatHistory();

function estimateTokens(text){
  return Math.max(1,Math.ceil(String(text||"").length/4));
}

function saveUsage(stat){
  try{
    const current=JSON.parse(localStorage.getItem(CHAT_META_KEY)||"{}");
    current.requests=(current.requests||0)+1;
    current.input_tokens=(current.input_tokens||0)+(stat.input_tokens||0);
    current.output_tokens=(current.output_tokens||0)+(stat.output_tokens||0);
    current.estimated_cost_usd=(current.estimated_cost_usd||0)+(stat.estimated_cost_usd||0);
    current.last_provider=stat.provider||current.last_provider||"";
    localStorage.setItem(CHAT_META_KEY,JSON.stringify(current));
  }catch(err){}
}

function clientRateAllowed(){
  const now=Date.now();
  requestTimestamps=requestTimestamps.filter(t=>now-t<60000);
  if(requestTimestamps.length>=CLIENT_MAX_PER_MINUTE) return false;
  requestTimestamps.push(now);
  return true;
}

function autoResize(){
  if(!chatInput) return;
  chatInput.style.height="auto";
  chatInput.style.height=Math.min(chatInput.scrollHeight,140)+"px";
  if(inputCounter) inputCounter.textContent=chatInput.value.length+"/"+MAX_MESSAGE_CHARS;
}
chatInput?.addEventListener("input",autoResize);
autoResize();

quickPrompts?.addEventListener("click",(e)=>{
  const btn=e.target.closest("[data-prompt]");
  if(!btn||isStreaming) return;
  chatInput.value=btn.dataset.prompt||"";
  autoResize();
  chatInput.focus();
});

function newChat(){
  chatHistory.length=0;
  try{localStorage.removeItem(CHAT_STORAGE_KEY);}catch(err){}
  renderStoredChatHistory();
  setCloudAiStatus("Cuộc trò chuyện mới. AI cloud sẵn sàng.");
}
document.getElementById("newChatBtn")?.addEventListener("click",newChat);
document.getElementById("clearChatBtn")?.addEventListener("click",newChat);

function appendStreamText(el,text){
  if(!text) return;
  el.textContent+=text;
  chatMessages.scrollTop=chatMessages.scrollHeight;
}

async function streamChat(messages,pending){
  const res=await fetch("/api/chat",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Accept":"text/event-stream"
    },
    body:JSON.stringify({
      stream:true,
      messages,
      context:{
        workspace:"demo-business",
        revenue:businessSnapshot.revenue_month,
        revenue_change:businessSnapshot.revenue_change,
        operating_cost:businessSnapshot.operating_cost,
        cost_change:businessSnapshot.cost_change,
        conversion:businessSnapshot.conversion,
        customers:businessSnapshot.interested_customers,
        conversions:businessSnapshot.converted_customers,
        productivity:businessSnapshot.productivity_score,
        tasks_completed:businessSnapshot.tasks_completed,
        tasks_on_time:businessSnapshot.tasks_on_time,
        wasted_time:businessSnapshot.wasted_time,
        leads:businessSnapshot.leads,
        insights:businessSnapshot.insights
      }
    })
  });

  if(!res.ok){
    const errorData=await res.json().catch(()=>({}));
    throw new Error(errorData.error||("HTTP "+res.status));
  }

  const reader=res.body?.getReader();
  if(!reader) throw new Error("Trình duyệt không hỗ trợ streaming.");

  const decoder=new TextDecoder();
  let buffer="";
  let meta={input_tokens:0,output_tokens:0,estimated_cost_usd:0,provider:"",model:""};

  while(true){
    const {value,done}=await reader.read();
    if(done) break;
    buffer+=decoder.decode(value,{stream:true});
    const events=buffer.split("\n\n");
    buffer=events.pop()||"";

    for(const event of events){
      for(const line of event.split("\n")){
        if(!line.startsWith("data:")) continue;
        const raw=line.slice(5).trim();
        if(!raw) continue;
        let payload;
        try{payload=JSON.parse(raw);}catch(err){continue;}
        if(payload.type==="meta"){
          meta={...meta,...payload};
          setProviderStatus(payload.provider,payload.model,"đang trả lời");
        }else if(payload.type==="delta"){
          appendStreamText(pending,payload.text||"");
        }else if(payload.type==="done"){
          meta={...meta,...payload};
        }else if(payload.type==="error"){
          throw new Error(payload.error||"AI stream failed");
        }
      }
    }
  }

  meta.input_tokens=meta.input_tokens||estimateTokens(messages.map(m=>m.content).join("\n"));
  meta.output_tokens=meta.output_tokens||estimateTokens(pending.textContent);
  saveUsage(meta);
  return meta;
}

chatForm?.addEventListener("submit",async(e)=>{
  e.preventDefault();
  if(isStreaming) return;

  const q=chatInput.value.trim();
  if(!q) return;
  if(q.length>MAX_MESSAGE_CHARS){
    setCloudAiStatus("Câu hỏi quá dài. Giới hạn là "+MAX_MESSAGE_CHARS+" ký tự.");
    return;
  }
  if(!clientRateAllowed()){
    setCloudAiStatus("Bạn đang gửi quá nhanh. Hãy chờ khoảng 1 phút rồi tiếp tục.");
    return;
  }

  isStreaming=true;
  sendChatBtn.disabled=true;
  quickPrompts?.querySelectorAll("button").forEach(b=>b.disabled=true);
  addMessage(q,"user");
  chatInput.value="";
  autoResize();

  chatHistory.push({role:"user",content:q});
  saveChatHistory();

  const pending=addMessage("","bot");
  pending.classList.add("streaming");
  setCloudAiStatus("Đang suy nghĩ…");
  if(chatProviderStatus) chatProviderStatus.textContent="AI cloud • đang kết nối";

  try{
    const meta=await streamChat(chatHistory,pending);
    if(!pending.textContent.trim()) throw new Error("AI không trả về nội dung.");
    chatHistory.push({role:"assistant",content:pending.textContent});
    saveChatHistory();
    updateUsage();
    setProviderStatus(meta.provider,meta.model,"sẵn sàng");
  }catch(err){
    pending.textContent="Không thể nhận phản hồi từ AI cloud: "+err.message;
    setCloudAiStatus("Lỗi: "+err.message);
  }finally{
    isStreaming=false;
    sendChatBtn.disabled=false;
    quickPrompts?.querySelectorAll("button").forEach(b=>b.disabled=false);
    chatInput.focus();
  }
});

document.getElementById("updatedAt").textContent="Cloud AI • MVP dữ liệu minh họa";
