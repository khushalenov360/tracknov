const { ReadableStream } = require('stream/web'); 
const encoder = new TextEncoder(); 
const decoder = new TextDecoder(); 

function buildOpenAiStream(response) { 
  const reader = response.body.getReader(); 
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

const mockResponse = { 
  body: new ReadableStream({ 
    start(c) { 
      c.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hey!"}}]}\n\n')); 
      c.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":" "}}]}\n\n')); 
      c.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"I\'m"}}]}\n\n')); 
      c.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":" Atomesus"}}]}\n\n')); 
      c.close(); 
    } 
  }) 
}; 

async function test() { 
  const stream = buildOpenAiStream(mockResponse); 
  const reader = stream.getReader(); 
  let out = ''; 
  while (true) { 
    const { done, value } = await reader.read(); 
    if (done) break; 
    out += decoder.decode(value); 
  } 
  console.log('OUTPUT: "' + out + '"'); 
} 
test();
