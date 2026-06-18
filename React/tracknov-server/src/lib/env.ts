import 'dotenv/config';
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

// In Next.js 15, explicit access to process.env is preferred for static optimization and Edge compatibility.
const geminiApiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const doublewordApiKeys = (process.env.DOUBLEWORD_API_KEYS || process.env.DOUBLEWORD_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const groqApiKeys = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const openRouterApiKeys = (process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const openAiApiKeys = (process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);

export const env = {
  doublewordApiKeys,
  geminiApiKeys,
  groqApiKeys,
  openRouterApiKeys,
  openAiApiKeys,
  geminiApiKey: geminiApiKeys[0] ?? "",
  aiProvider: process.env.AI_PROVIDER ?? "auto",
  aiModel: process.env.AI_MODEL ?? "",
  doublewordModel: process.env.DOUBLEWORD_MODEL ?? "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8",
  geminiModel: process.env.GEMINI_MODEL ?? process.env.AI_MODEL ?? "gemini-2.5-flash",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  openRouterModel: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
  ollamaModel: process.env.OLLAMA_MODEL ?? "qwen-vision-expert:latest",
  ollamaToolModel: process.env.OLLAMA_TOOL_MODEL ?? process.env.OLLAMA_CHAT_MODEL ?? "",
  ollamaVisionModel: process.env.OLLAMA_VISION_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen-vision-expert:latest",
  ollamaUrl: process.env.OLLAMA_URL ?? "http://192.168.29.48:11434/v1/chat/completions",
  aiReady: Boolean(doublewordApiKeys.length || geminiApiKeys.length || groqApiKeys.length || openRouterApiKeys.length || openAiApiKeys.length || process.env.OLLAMA_URL),
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  demoModeEnabled: process.env.DEMO_MODE_ENABLED === "true",
  isConfigured: Boolean(url && anonKey),
};

import { envConfig } from "./env-config";

// Authoritative environment check
if (typeof window === "undefined") {
  if (!env.isConfigured && !envConfig.isDevelopment) {
    throw new Error("🚨 FATAL: Supabase configuration missing in non-development environment.");
  }
  
  if (envConfig.isProduction) {
    const requiredProductionSecrets = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'GEMINI_API_KEY',
    ];
    
    const missing = requiredProductionSecrets.filter(s => !process.env[s]);
    if (missing.length > 0) {
      console.error(`❌ SECRETS GOVERNANCE FAILURE: Missing production secrets: ${missing.join(", ")}`);
      // In a real production build, we might want to throw here.
    }
  }
}
