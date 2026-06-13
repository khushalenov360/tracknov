const { ReadableStream } = require('stream/web'); 
const encoder = new TextEncoder(); 
const decoder = new TextDecoder(); 

function buildOpenAiStream() { 
  let c; 
  const rs = new ReadableStream({ start(ctrl) { c = ctrl; } }); 
  c.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hey!"}}]}\n\n')); 
  c.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":" "}}]}\n\n')); 
  c.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"I\\'m"}}]}\n\n')); 
  c.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":" Atomesus"}}]}\n\n')); 
  c.close(); 

  const reader = rs.getReader(); 
  return new ReadableStream({ 
    async start(controller) { 
      let buffer = ''; 
      const processLine = (line) => { 
        if (!line || line === '[DONE]') return; 
        try { 
          const parsed = JSON.parse(line); 
          const delta = parsed.choices?.[0]?.delta?.content ?? ''; 
          if (delta) { 
            const safe = delta.replace(/\[\[.*\]\]/g, ''); 
            if (safe) controller.enqueue(encoder.encode(safe)); 
          } 
        } catch {} 
      }; 
      try { 
        while (true) { 
          const { value, done } = await reader.read(); 
          if (done) break; 
          buffer += decoder.decode(value, { stream: true }); 
          const lines = buffer.split('\n'); 
          buffer = lines.pop() ?? ''; 
          for (const raw of lines) { 
            const line = raw.replace(/^data:\s*/, '').trim(); 
            if (line) processLine(line); 
          } 
        } 
        if (buffer.trim()) processLine(buffer.replace(/^data:\s*/, '').trim()); 
        controller.close(); 
      } catch (e) { 
        controller.error(e); 
      } finally { 
        reader.releaseLock(); 
      } 
    } 
  }); 
} 

function sanitizeAiResponse(text) { 
  return text 
    .replace(/RAG\s+\d+\s*\[[^\]]*\]\s*score=[\d.]+:?\s*/gi, "") 
    .replace(/score=[\d.]+/gi, "") 
    .replace(/(Using|Triggering|Switched to)\s+(deterministic route|multi-provider|fallback engine|tool-call phase|function call)[^.]*\.?/gi, "") 
    .replace(/\b(deterministic route|multi-provider|fallback engine|tool-call phase|function call)\b:?/gi, "") 
    .replace(/\b(vector metadata|context_id|embedding|rag match|retrieved context)\b:?/gi, "") 
    .replace(/\b(debug|trace|diagnostic|runtime log)\b:?\s*/gi, "") 
    .replace(/\s\s+/g, " ") 
    .replace(/\.\s+\./g, ".") 
    .replace(/\(\s+\)/g, "()") 
    .replace(/\(\s+/g, "(") 
    .replace(/\s+\)/g, ")") 
    .replace(/^\.\s*/, "") 
    .trim(); 
} 

function applyResponseGovernance(inputStream) { 
  return new ReadableStream({ 
    async start(controller) { 
      const reader = inputStream.getReader(); 
      let fullText = ""; 
      while (true) { 
        const { done, value } = await reader.read(); 
        if (done) break; 
        fullText += decoder.decode(value, { stream: true }); 
      } 
      fullText += decoder.decode(); 
      let safe = sanitizeAiResponse(fullText); 
      controller.enqueue(encoder.encode(safe)); 
      controller.close(); 
    }, 
  }); 
} 

async function test() { 
  const stream1 = buildOpenAiStream(); 
  const stream2 = applyResponseGovernance(stream1); 
  const reader = stream2.getReader(); 
  let out = ''; 
  while (true) { 
    const { done, value } = await reader.read(); 
    if (done) break; 
    out += decoder.decode(value); 
  } 
  console.log('OUTPUT: "' + out + '"'); 
} 

test();
