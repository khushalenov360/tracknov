import dotenv from "dotenv";
import fs from "fs";

// Load from tracknov-web .env.local if it exists
if (fs.existsSync("apps/tracknov-web/.env.local")) {
  dotenv.config({ path: "apps/tracknov-web/.env.local" });
}

async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { name: "Gemini 2.5 Flash", status: "MISSING_KEY" };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
    });
    if (res.status === 429) return { name: "Gemini 2.5 Flash", status: "QUOTA_EXHAUSTED / RATE_LIMITED" };
    if (!res.ok) return { name: "Gemini 2.5 Flash", status: `ERROR: ${res.status} ${res.statusText}` };
    return { name: "Gemini 2.5 Flash", status: "ONLINE (Quota OK)" };
  } catch (e: any) { return { name: "Gemini 2.5 Flash", status: "FETCH_ERROR: " + e.message }; }
}

async function testDeepSeek() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return { name: "DeepSeek", status: "MISSING_KEY" };
  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: "hi" }], max_tokens: 5 })
    });
    if (res.status === 429 || res.status === 402) return { name: "DeepSeek", status: "QUOTA_EXHAUSTED / INSUFFICIENT_BALANCE" };
    if (!res.ok) return { name: "DeepSeek", status: `ERROR: ${res.status} ${res.statusText}` };
    return { name: "DeepSeek", status: "ONLINE (Quota OK)" };
  } catch (e: any) { return { name: "DeepSeek", status: "FETCH_ERROR: " + e.message }; }
}

async function testGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { name: "Groq Llama-3.3-70b", status: "MISSING_KEY" };
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: "hi" }], max_tokens: 5 })
    });
    if (res.status === 429) return { name: "Groq Llama-3.3-70b", status: "QUOTA_EXHAUSTED / RATE_LIMITED" };
    if (!res.ok) return { name: "Groq Llama-3.3-70b", status: `ERROR: ${res.status} ${res.statusText}` };
    return { name: "Groq Llama-3.3-70b", status: "ONLINE (Quota OK)" };
  } catch (e: any) { return { name: "Groq Llama-3.3-70b", status: "FETCH_ERROR: " + e.message }; }
}

async function testOpenAi() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { name: "OpenAI GPT-4o-mini", status: "MISSING_KEY" };
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }], max_tokens: 5 })
    });
    if (res.status === 429) return { name: "OpenAI GPT-4o-mini", status: "QUOTA_EXHAUSTED / RATE_LIMITED" };
    if (!res.ok) return { name: "OpenAI GPT-4o-mini", status: `ERROR: ${res.status} ${res.statusText}` };
    return { name: "OpenAI GPT-4o-mini", status: "ONLINE (Quota OK)" };
  } catch (e: any) { return { name: "OpenAI GPT-4o-mini", status: "FETCH_ERROR: " + e.message }; }
}

async function main() {
  console.log("Checking API Quotas for EnovAIT...");
  const results = await Promise.all([
    testGemini(),
    testDeepSeek(),
    testGroq(),
    testOpenAi()
  ]);
  
  console.table(results);
}

main();
