const fs = require('fs');

async function testOllama() {
  const dummyText = "This is a dummy system prompt that will be repeated to reach 6000 characters. ".repeat(100);
  const body = {
    model: "llama3.2:1b",
    messages: [
      { role: "system", content: dummyText },
      { role: "user", content: "Hello! Please answer this briefly." }
    ],
    stream: true
  };

  const start = Date.now();
  console.log("Sending request to Ollama...");
  try {
    const res = await fetch("http://192.168.29.48:11434/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    console.log(`Headers received in ${Date.now() - start}ms`);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const reader = res.body.getReader();
    let firstChunk = true;
    while (true) {
      const { done } = await reader.read();
      if (firstChunk) {
        console.log(`First token generated in ${Date.now() - start}ms`);
        firstChunk = false;
      }
      if (done) break;
    }
    console.log(`Stream complete in ${Date.now() - start}ms`);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testOllama();
