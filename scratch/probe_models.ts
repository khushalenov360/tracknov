import * as dotenv from "dotenv";
dotenv.config({ path: "apps/tracknov-web/.env.local" });

const key = process.env.GEMINI_API_KEY!;
const models = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro-latest",
];

async function check() {
  for (const m of models) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }] }),
      }
    );
    const body = await r.json().catch(() => null);
    console.log(m, r.status, body?.error?.message || "OK");
  }
}

check().catch(console.error);
