async function testGemma() {
  console.log("Sending a test prompt to Local Gemma 2...");
  const start = Date.now();
  
  try {
    const response = await fetch("http://127.0.0.1:11434/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemma2",
        messages: [{ role: "user", content: "Write a 1-sentence haiku about artificial intelligence." }],
        temperature: 0.5
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`, text);
      return;
    }

    const data = await response.json();
    const end = Date.now();
    
    console.log("\n✅ SUCCESS! Gemma 2 responded in", (end - start) / 1000, "seconds:\n");
    console.log(data.choices[0].message.content);
    
  } catch (err: any) {
    console.error("Failed to connect to Ollama:", err.message);
  }
}

testGemma();
