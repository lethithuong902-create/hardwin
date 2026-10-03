// Hardwin Business OS — dữ liệu demo chỉ dùng khi workspace chưa có dữ liệu thật.
const demoLeads = [
  {name:"Minh Phát Media",source:"Website",need:"Quản lý khách hàng",score:94,status:"Nóng"},
  {name:"An Nhiên Shop",source:"Facebook",need:"Tối ưu chi phí",score:87,status:"Nóng"},
  {name:"VietHome",source:"Referral",need:"Tăng lead",score:79,status:"Ấm"},
  {name:"Nova Academy",source:"Chatbot",need:"Nội dung AI",score:71,status:"Ấm"},
  {name:"Bắc Việt Food",source:"Google",need:"Dashboard",score:62,status:"Ấm"},
  {name:"Gia Bảo Studio",source:"TikTok",need:"Livestream",score:48,status:"Lạnh"},
  {name:"Green Farm",source:"Website",need:"CRM",score:43,status:"Lạnh"}
];

let leads = [...demoLeads];
let businessSnapshot = {
  workspace_id:"",
  workspace_name:"Workspace",
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
  insights:[]
};

let currentUser = null;
let currentWorkspace = null;
let requestTimestamps = [];
let isStreaming = false;

const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const sendChatBtn = document.getElementById("sendChatBtn");
const inputCounter = document.getElementById("inputCounter");
const usageStatus = document.getElementById("usageStatus");
const chatProviderStatus = document.getElementById("chatProviderStatus");
const cloudAiStatusText = document.getElementById("cloudAiStatusText");
const quickPrompts = document.getElementById("quickPrompts");
const workspaceSelect = document.getElementById("workspaceSelect");
const workspaceMeta = document.getElementById("workspaceMeta");
const dataModeText = document.getElementById("dataModeText");

const CHAT_STORAGE_KEY="hardwin_chat_history_v2";
const CHAT_META_KEY="hardwin_chat_meta_v2";
const MAX_STORED_MESSAGES=60;
const MAX_MESSAGE_CHARS=4000;
const CLIENT_MAX_PER_MINUTE=12;

function formatMoney(value){
  if(value===null||value===undefined||value==="") return null;
  const number=Number(value);
  if(!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(number);
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[char]));
}

function renderLeads(data=leads){
  const cls={Nóng:"hot",Ấm:"warm",Lạnh:"cold"};
  const table=document.getElementById("leadTable");
  if(!table) return;
  table.innerHTML=data.map(l=>`
    <tr>
      <td><span class="lead-name">${escapeHtml(l.name||"Chưa có tên")}</span></td>
      <td>${escapeHtml(l.source||"—")}</td>
      <td>${escapeHtml(l.need||"—")}</td>
      <td class="lead-score">${Number(l.score||0)}</td>
      <td><span class="pill ${cls[l.status]||"warm"}">${escapeHtml(String(l.status||"Mới").toUpperCase())}</span></td>
    </tr>`).join("");
}

function renderInsights(){
  const fallback=[
    ["Tìm khách hàng","Mở Growth Engine để tìm nhóm khách phù hợp và tạo kế hoạch tiếp cận."],
    ["Kiểm tra chi phí","Rà soát các khoản chi lặp lại nhưng ít tạo ra giá trị."],
    ["Tạo nội dung","Biến một vấn đề của khách hàng thành nội dung để thu hút người quan tâm."],
    ["Ưu tiên follow-up","Tập trung trước vào những lead có nhu cầu và tín hiệu mua cao."]
  ];
  const list=document.getElementById("insightList");
  if(!list) return;
  list.innerHTML=(businessSnapshot.insights.length?businessSnapshot.insights.map(x=>[x,"Dựa trên dữ liệu workspace hiện tại."]):fallback)
    .map(x=>`<div class="insight"><strong>${escapeHtml(x[0])}</strong><span>${escapeHtml(x[1])}</span></div>`).join("");
}

function renderDashboard(){
  document.getElementById("revenue").textContent=businessSnapshot.revenue_month;
  document.getElementById("cost").textContent=businessSnapshot.operating_cost;
  document.getElementById("conversion").textContent=businessSnapshot.conversion;
  const hot=leads.filter(l=>String(l.status).toLowerCase()==="nóng"||Number(l.score)>=80).length;
  document.getElementById("hotLeads").textContent=String(hot || leads.length);
  renderLeads();
  renderInsights();

  const bars=[72,86,64,92,78,96,88];
  const chart=document.getElementById("chartBars");
  if(chart){
    chart.innerHTML=bars.map(v=>`<div class="bar-group"><i class="bar revenue-bar" style="height:${v}%"></i><i class="bar cost-bar" style="height:${Math.max(16,v*.55)}%"></i></div>`).join("");
  }
}

async function loadWorkspaceData(){
  const supabase=await window.hardwinSupabaseReady;
  const workspaceId=currentWorkspace.id;

  const [profileResult, leadsResult, customersResult] = await Promise.all([
    supabase.from("business_profiles")
      .select("company_name,monthly_revenue,monthly_cost")
      .eq("workspace_id",workspaceId)
      .maybeSingle(),
    supabase.from("leads")
      .select("name,email,phone,company,source,need,status,score,consent_to_contact")
      .eq("workspace_id",workspaceId)
      .order("score",{ascending:false}),
    supabase.from("customers")
      .select("id",{count:"exact",head:true})
      .eq("workspace_id",workspaceId)
  ]);

  if(profileResult.error) throw profileResult.error;
  if(leadsResult.error) throw leadsResult.error;
  if(customersResult.error) throw customersResult.error;

  leads = (leadsResult.data||[]).map(l=>({
    name:l.name||l.company||"Khách hàng",
    source:l.source||"—",
    need:l.need||"—",
    score:Number(l.score||0),
    status:Number(l.score||0)>=80?"Nóng":Number(l.score||0)>=60?"Ấm":"Lạnh"
  }));

  const profile=profileResult.data;
  businessSnapshot.workspace_id=workspaceId;
  businessSnapshot.workspace_name=currentWorkspace.name;
  businessSnapshot.interested_customers=String(customersResult.count||0);

  if(profile?.monthly_revenue!==null && profile?.monthly_revenue!==undefined){
    businessSnapshot.revenue_month=formatMoney(profile.monthly_revenue)||businessSnapshot.revenue_month;
  }
  if(profile?.monthly_cost!==null && profile?.monthly_cost!==undefined){
    businessSnapshot.operating_cost=formatMoney(profile.monthly_cost)||businessSnapshot.operating_cost;
  }

  if(leads.length){
    dataModeText.textContent="Đang dùng dữ liệu thật của workspace: "+currentWorkspace.name+".";
  }else{
    leads=[...demoLeads];
    dataModeText.textContent="Workspace chưa có dữ liệu khách hàng; Hardwin đang hiển thị dữ liệu mẫu để bạn thử.";
  }

  businessSnapshot.leads=leads;
  businessSnapshot.insights=[];
  renderDashboard();
}

async function loadAuthAndWorkspace(){
  try{
    const supabase=await window.hardwinSupabaseReady;
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){
      window.location.assign("login.html");
      return;
    }

    currentUser=session.user;
    const workspaces=await window.hardwinAuth.listWorkspaces();
    if(!workspaces.length){
      window.location.assign("onboarding.html");
      return;
    }

    const saved=window.hardwinAuth.getCurrentWorkspaceId();
    currentWorkspace=workspaces.find(w=>w.id===saved)||workspaces[0];
    window.hardwinAuth.setCurrentWorkspaceId(currentWorkspace.id);

    workspaceSelect.innerHTML=workspaces.map(w=>`<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("");
    workspaceSelect.value=currentWorkspace.id;
    workspaceMeta.textContent=(currentWorkspace.plan||"free")+" · "+(currentUser.email||"đã đăng nhập");

    await loadWorkspaceData();
  }catch(error){
    dataModeText.textContent="Không thể tải dữ liệu thật: "+(error.message||"lỗi không xác định");
    leads=[...demoLeads];
    businessSnapshot.leads=leads;
    renderDashboard();
  }
}

workspaceSelect?.addEventListener("change",async()=>{
  const id=workspaceSelect.value;
  window.hardwinAuth.setCurrentWorkspaceId(id);
  window.location.reload();
});

document.getElementById("signOutBtn")?.addEventListener("click",async()=>{
  try{
    await window.hardwinAuth.signOut();
  }finally{
    window.hardwinAuth.clearCurrentWorkspaceId();
    window.location.assign("login.html");
  }
});

document.getElementById("sortLeadBtn")?.addEventListener("click",()=>{
  renderLeads([...leads].sort((a,b)=>b.score-a.score));
});

document.getElementById("refreshBtn")?.addEventListener("click",async()=>{
  try{
    await loadWorkspaceData();
    document.getElementById("updatedAt").textContent="Cập nhật: "+new Date().toLocaleString("vi-VN");
  }catch(error){
    document.getElementById("updatedAt").textContent="Không tải lại được dữ liệu.";
  }
});

document.getElementById("exportBtn")?.addEventListener("click",()=>{
  const report={...businessSnapshot,exported_at:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="hardwin-business-report.json";
  link.click();
  URL.revokeObjectURL(url);
});

function loadChatHistory(){
  try{
    const parsed=JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)||"[]");
    return Array.isArray(parsed)
      ? parsed.filter(m=>(m.role==="user"||m.role==="assistant")&&typeof m.content==="string").slice(-MAX_STORED_MESSAGES)
      : [];
  }catch{return [];}
}
const chatHistory=loadChatHistory();

function saveChatHistory(){
  try{localStorage.setItem(CHAT_STORAGE_KEY,JSON.stringify(chatHistory.slice(-MAX_STORED_MESSAGES)));}catch{}
}

function loadUsage(){
  try{return JSON.parse(localStorage.getItem(CHAT_META_KEY)||"{}");}catch{return {};}
}

function updateUsage(){
  const usage=loadUsage();
  const users=chatHistory.filter(m=>m.role==="user").length;
  const tokens=(usage.input_tokens||0)+(usage.output_tokens||0);
  if(usageStatus) usageStatus.textContent=`${users} lượt • ~${tokens.toLocaleString("vi-VN")} token`;
}

function setCloudAiStatus(message){
  if(cloudAiStatusText) cloudAiStatusText.textContent=message;
}

function setProviderStatus(provider,model,extra=""){
  if(chatProviderStatus) chatProviderStatus.textContent=(provider?provider+" • ":"")+"cloud"+(model?" • "+model:"")+(extra?" • "+extra:"");
  if(cloudAiStatusText&&provider) cloudAiStatusText.textContent="Đang dùng "+provider+(model?" / "+model:"")+" trên cloud.";
}

function addMessage(text,role){
  const el=document.createElement("div");
  el.className="bubble "+role;
  el.textContent=text;
  chatMessages.appendChild(el);
  chatMessages.scrollTop=chatMessages.scrollHeight;
  return el;
}

function renderStoredChatHistory(){
  chatMessages.innerHTML="";
  if(!chatHistory.length){
    addMessage("Xin chào. Tôi là Hardwin AI. Hãy hỏi về doanh thu, chi phí, khách hàng hoặc cách tăng trưởng.","bot");
  }else{
    chatHistory.forEach(m=>addMessage(m.content,m.role==="assistant"?"bot":"user"));
  }
  updateUsage();
}

function estimateTokens(text){return Math.max(1,Math.ceil(String(text||"").length/4));}

function saveUsage(stat){
  try{
    const current=loadUsage();
    current.requests=(current.requests||0)+1;
    current.input_tokens=(current.input_tokens||0)+(stat.input_tokens||0);
    current.output_tokens=(current.output_tokens||0)+(stat.output_tokens||0);
    current.estimated_cost_usd=(current.estimated_cost_usd||0)+(stat.estimated_cost_usd||0);
    current.last_provider=stat.provider||current.last_provider||"";
    localStorage.setItem(CHAT_META_KEY,JSON.stringify(current));
  }catch{}
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

quickPrompts?.addEventListener("click",event=>{
  const button=event.target.closest("[data-prompt]");
  if(!button||isStreaming) return;
  chatInput.value=button.dataset.prompt||"";
  autoResize();
  chatInput.focus();
});

function newChat(){
  chatHistory.length=0;
  try{localStorage.removeItem(CHAT_STORAGE_KEY);}catch{}
  renderStoredChatHistory();
}
document.getElementById("newChatBtn")?.addEventListener("click",newChat);
document.getElementById("clearChatBtn")?.addEventListener("click",newChat);

async function streamChat(messages,pending){
  const response=await fetch("/api/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"text/event-stream"},
    body:JSON.stringify({
      stream:true,
      messages,
      context:{
        workspace_id:businessSnapshot.workspace_id,
        workspace_name:businessSnapshot.workspace_name,
        revenue:businessSnapshot.revenue_month,
        operating_cost:businessSnapshot.operating_cost,
        conversion:businessSnapshot.conversion,
        customers:businessSnapshot.interested_customers,
        leads:businessSnapshot.leads
      }
    })
  });

  if(!response.ok){
    const data=await response.json().catch(()=>({}));
    throw new Error(data.error||("HTTP "+response.status));
  }

  const reader=response.body?.getReader();
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
      const line=event.split("\n").find(x=>x.startsWith("data:"));
      if(!line) continue;
      let payload;
      try{payload=JSON.parse(line.slice(5).trim());}catch{continue;}
      if(payload.type==="meta"){
        meta={...meta,...payload};
        setProviderStatus(payload.provider,payload.model,"đang trả lời");
      }else if(payload.type==="delta"){
        pending.textContent+=payload.text||"";
        chatMessages.scrollTop=chatMessages.scrollHeight;
      }else if(payload.type==="done"){
        meta={...meta,...payload};
      }else if(payload.type==="error"){
        throw new Error(payload.error||"AI lỗi");
      }
    }
  }

  meta.input_tokens=meta.input_tokens||estimateTokens(messages.map(m=>m.content).join("\n"));
  meta.output_tokens=meta.output_tokens||estimateTokens(pending.textContent);
  saveUsage(meta);
  return meta;
}

chatForm?.addEventListener("submit",async event=>{
  event.preventDefault();
  if(isStreaming) return;

  const query=chatInput.value.trim();
  if(!query) return;
  if(query.length>MAX_MESSAGE_CHARS){
    setCloudAiStatus("Câu hỏi quá dài.");
    return;
  }
  if(!clientRateAllowed()){
    setCloudAiStatus("Bạn đang gửi quá nhanh. Hãy thử lại sau một lúc.");
    return;
  }

  isStreaming=true;
  sendChatBtn.disabled=true;
  quickPrompts?.querySelectorAll("button").forEach(b=>b.disabled=true);

  addMessage(query,"user");
  chatHistory.push({role:"user",content:query});
  saveChatHistory();
  chatInput.value="";
  autoResize();

  const pending=addMessage("","bot");
  setCloudAiStatus("Hardwin đang suy nghĩ…");

  try{
    const meta=await streamChat(chatHistory,pending);
    if(!pending.textContent.trim()) throw new Error("AI không trả về nội dung.");
    chatHistory.push({role:"assistant",content:pending.textContent});
    saveChatHistory();
    updateUsage();
    setProviderStatus(meta.provider,meta.model,"sẵn sàng");
  }catch(error){
    pending.textContent="Không thể nhận phản hồi: "+(error.message||"lỗi");
    setCloudAiStatus("Có lỗi khi gọi AI.");
  }finally{
    isStreaming=false;
    sendChatBtn.disabled=false;
    quickPrompts?.querySelectorAll("button").forEach(b=>b.disabled=false);
    chatInput.focus();
  }
});

renderStoredChatHistory();
autoResize();

window.hardwinSupabaseReady.then(loadAuthAndWorkspace).catch(error=>{
  dataModeText.textContent=error.message||"Không thể khởi động Supabase.";
});
