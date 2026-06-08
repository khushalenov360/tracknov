

async function run() {
  try {
    const res = await fetch("https://uiecvxxamykfubgtqzap.supabase.co/functions/v1/enovait-copilot", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.SUPABASE_ANON_KEY // or just some token, wait, it requires a valid JWT
      },
      body: JSON.stringify({
        context: { title: "Bhavarkua", summary: "Project" },
        messages: [{ role: "user", content: "how many credits in bhavarkua project total?" }],
        snapshot: "Snapshot",
        role: "consultant"
      })
    });
    
    if (!res.ok) {
      console.error("HTTP ERROR:", res.status, res.statusText);
      console.error(await res.text());
      return;
    }
    
    console.log("Success! Reading stream...");
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}

run();
