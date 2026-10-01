const PROVIDER_ORDER = ["gemini", "groq", "openrouter"];
const RATE_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

const rateStore = globalThis.__hardwinRateStore || new Map();
globalThis.__hardwinRateStore = rateStore;

function getClientKey(req) {
  return String(
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  ).split(",")[0].trim();
}

function checkRateLimit(req) {
  const key = getClientKey(req);
  const now = Date.now();
  const recent = (rateStore.get(key) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    rateStore.set(key, recent);
    return { allowed:false, retryAfter:Math.max(1,Math.ceil((RATE_WINDOW_MS-(now-recent[0]))/1000)) };
  }
  recent.push(now);
  rateStore.set(key, recent);
  return { allowed:true, retryAfter:0 };
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

function sse(res, payload) {
  res.write("data: " + JSON.stringify(payload) + "\n\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error:"Method not allowed" });
  }

  const limit=checkRateLimit(req);
  if(!limit.allowed){
    res.setHeader("Retry-After",String(limit.retryAfter));
    return res.status(429).json({error:"Bạn đang gửi quá nhanh. Vui lòng thử lại sau "+limit.retryAfter+" giây."});
  }

  try {
    const body=req.body||{};
    const rawMessages=Array.isArray(body.messages)?body.messages.slice(-30):[];
    if(!rawMessages.length) return res.status(400).json({error:"messages is required"});

    const safeMessages=rawMessages.map((m)=>({
      role:m.role==="assistant"?"assistant":"user",
      content:String(m.content||"").slice(0,4000)
    }));

    const context=JSON.stringify(body.context||{}).slice(0,14000);
    const system={
      role:"system",
      content:[
        "Bạn là Hardwin AI, trợ lý vận hành cho doanh nghiệp nhỏ và vừa.",
        "Trả lời bằng tiếng Việt, tự nhiên, thực tế, đủ ý nhưng không lan man.",
        "Hãy phân tích doanh thu, chi phí, khách hàng, chuyển đổi, năng suất và insight được cung cấp.",
        "Không bịa số liệu. Nếu số liệu là dữ liệu mẫu, nói rõ.",
        "Khi phù hợp, đưa ra: vấn đề -> nguyên nhân khả dĩ -> bằng chứng -> hành động đề xuất -> cách đo kết quả.",
        "Ngữ cảnh workspace hiện tại: "+context
      ].join("\n")
    };

    const preferred=(process.env.AI_PROVIDER||"auto").toLowerCase();
    const order=preferred==="auto"?PROVIDER_ORDER:[preferred,...PROVIDER_ORDER.filter(p=>p!==preferred)];
    const wantStream=String(body.stream||"").toLowerCase()==="true" ||
      String(req.headers.accept||"").includes("text/event-stream");

    if(wantStream){
      res.statusCode=200;
      res.setHeader("Content-Type","text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control","no-cache, no-transform");
      res.setHeader("Connection","keep-alive");
      res.setHeader("X-Accel-Buffering","no");

      const errors=[];
      for(const provider of order){
        try{
          let result;
          if(provider==="gemini" && process.env.GEMINI_API_KEY){
            result=await streamGemini(
              res,
              process.env.GEMINI_API_KEY,
              process.env.GEMINI_MODEL||"gemini-2.5-flash-lite",
              [system,...safeMessages]
            );
          }else if(provider==="groq" && process.env.GROQ_API_KEY){
            result=await streamOpenAICompatible(
              res,
              "https://api.groq.com/openai/v1",
              process.env.GROQ_API_KEY,
              process.env.GROQ_MODEL||"openai/gpt-oss-20b",
              [system,...safeMessages]
            );
          }else if(provider==="openrouter" && process.env.OPENROUTER_API_KEY){
            result=await streamOpenAICompatible(
              res,
              "https://openrouter.ai/api/v1",
              process.env.OPENROUTER_API_KEY,
              process.env.OPENROUTER_MODEL||"openrouter/free",
              [system,...safeMessages],
              {
                "HTTP-Referer":process.env.APP_URL||"https://github.com/lethithuong902-create/hardwin",
                "X-Title":"Hardwin Business OS"
              }
            );
          }else{
            errors.push(provider+": not configured");
            continue;
          }

          const inputTokens=estimateTokens(safeMessages.map(m=>m.content).join("\n")+context);
          const outputTokens=result.output_tokens||estimateTokens(result.text);
          sse(res,{
            type:"done",
            provider,
            model:result.model,
            input_tokens:inputTokens,
            output_tokens:outputTokens,
            estimated_cost_usd:0
          });
          return res.end();
        }catch(error){
          errors.push(provider+": "+error.message);
        }
      }

      sse(res,{type:"error",error:"Tất cả nguồn AI miễn phí hiện không khả dụng.",providers:errors});
      return res.end();
    }

    const errors=[];
    for(const provider of order){
      try{
        if(provider==="gemini" && process.env.GEMINI_API_KEY){
          const result=await callGemini(process.env.GEMINI_API_KEY,process.env.GEMINI_MODEL||"gemini-2.5-flash-lite",[system,...safeMessages]);
          return res.status(200).json({
            reply:result.reply,provider,model:result.model,
            usage:{input_tokens:estimateTokens(safeMessages.map(m=>m.content).join("\n")+context),output_tokens:estimateTokens(result.reply),estimated_cost_usd:0}
          });
        }
        if(provider==="groq" && process.env.GROQ_API_KEY){
          const result=await callOpenAICompatible("https://api.groq.com/openai/v1",process.env.GROQ_API_KEY,process.env.GROQ_MODEL||"openai/gpt-oss-20b",[system,...safeMessages]);
          return res.status(200).json({
            reply:result.reply,provider,model:result.model,
            usage:{input_tokens:estimateTokens(safeMessages.map(m=>m.content).join("\n")+context),output_tokens:estimateTokens(result.reply),estimated_cost_usd:0}
          });
        }
        if(provider==="openrouter" && process.env.OPENROUTER_API_KEY){
          const result=await callOpenAICompatible("https://openrouter.ai/api/v1",process.env.OPENROUTER_API_KEY,process.env.OPENROUTER_MODEL||"openrouter/free",[system,...safeMessages],{
            "HTTP-Referer":process.env.APP_URL||"https://github.com/lethithuong902-create/hardwin",
            "X-Title":"Hardwin Business OS"
          });
          return res.status(200).json({
            reply:result.reply,provider,model:result.model,
            usage:{input_tokens:estimateTokens(safeMessages.map(m=>m.content).join("\n")+context),output_tokens:estimateTokens(result.reply),estimated_cost_usd:0}
          });
        }
        errors.push(provider+": not configured");
      }catch(error){errors.push(provider+": "+error.message);}
    }

    return res.status(503).json({error:"Tất cả nguồn AI miễn phí hiện không khả dụng.",providers:errors});
  }catch(error){
    console.error(error);
    return res.status(500).json({error:"AI service failed"});
  }
}

async function streamOpenAICompatible(res,baseUrl,apiKey,model,messages,extraHeaders={}){
  const response=await fetch(baseUrl.replace(/\/$/,"")+"/chat/completions",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey,...extraHeaders},
    body:JSON.stringify({
      model,messages,temperature:0.2,max_tokens:700,stream:true,
      stream_options:{include_usage:true}
    })
  });
  if(!response.ok) throw new Error("HTTP "+response.status);
  sse(res,{type:"meta",provider:model.includes("openrouter")?"openrouter":"groq",model});
  return await consumeOpenAIStream(res,response,model);
}

async function consumeOpenAIStream(res,response,model){
  const reader=response.body?.getReader();
  if(!reader) throw new Error("Provider stream unavailable");
  const decoder=new TextDecoder();
  let buffer="";
  let textOut="";
  let output_tokens=0;

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
        if(!raw || raw==="[DONE]") continue;
        let data;
        try{data=JSON.parse(raw);}catch{continue;}
        const delta=data?.choices?.[0]?.delta?.content||"";
        if(delta){textOut+=delta;sse(res,{type:"delta",text:delta});}
        output_tokens=data?.usage?.completion_tokens||output_tokens;
      }
    }
  }
  return {text:textOut,output_tokens,model};
}

async function streamGemini(res,apiKey,model,messages){
  const systemText=messages.find(m=>m.role==="system")?.content||"";
  const contents=messages.filter(m=>m.role!=="system").map(m=>({
    role:m.role==="assistant"?"model":"user",
    parts:[{text:String(m.content||"")}]
  }));
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+
    encodeURIComponent(model)+":streamGenerateContent?alt=sse&key="+encodeURIComponent(apiKey);

  const response=await fetch(url,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      systemInstruction:{parts:[{text:systemText}]},
      contents,
      generationConfig:{temperature:0.2,maxOutputTokens:700}
    })
  });

  if(!response.ok) throw new Error("HTTP "+response.status);
  sse(res,{type:"meta",provider:"gemini",model});

  const reader=response.body?.getReader();
  if(!reader) throw new Error("Provider stream unavailable");
  const decoder=new TextDecoder();
  let buffer="";
  let textOut="";

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
        let data;
        try{data=JSON.parse(raw);}catch{continue;}
        const delta=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
        if(delta){textOut+=delta;sse(res,{type:"delta",text:delta});}
      }
    }
  }
  return {text:textOut,model};
}

async function callOpenAICompatible(baseUrl,apiKey,model,messages,extraHeaders={}){
  const response=await fetch(baseUrl.replace(/\/$/,"")+"/chat/completions",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey,...extraHeaders},
    body:JSON.stringify({model,messages,temperature:0.2,max_tokens:700})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error("HTTP "+response.status);
  return {reply:data?.choices?.[0]?.message?.content||"Không nhận được phản hồi từ model.",model};
}

async function callGemini(apiKey,model,messages){
  const systemText=messages.find(m=>m.role==="system")?.content||"";
  const contents=messages.filter(m=>m.role!=="system").map(m=>({
    role:m.role==="assistant"?"model":"user",
    parts:[{text:String(m.content||"")}]
  }));
  const response=await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/"+
    encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(apiKey),
    {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:systemText}]},
        contents,
        generationConfig:{temperature:0.2,maxOutputTokens:700}
      })
    }
  );
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error("HTTP "+response.status);
  return {
    reply:data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim()||"Không nhận được phản hồi từ model.",
    model
  };
}
