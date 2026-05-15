import dotenv from "dotenv";
import path from "path";

// Explicitly load .env.local (standard for Next.js) or .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// In Next.js 15, explicit access to process.env is preferred for static optimization and Edge compatibility.
const geminiApiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const doublewordApiKeys = (process.env.DOUBLEWORD_API_KEYS || process.env.DOUBLEWORD_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const groqApiKeys = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const openRouterApiKeys = (process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);

export const env = {
  doublewordApiKeys,
  geminiApiKeys,
  groqApiKeys,
  openRouterApiKeys,
  geminiApiKey: geminiApiKeys[0] ?? "",
  aiProvider: process.env.AI_PROVIDER ?? "auto",
  aiModel: process.env.AI_MODEL ?? "",
  doublewordModel: process.env.DOUBLEWORD_MODEL ?? "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8",
  geminiModel: process.env.GEMINI_MODEL ?? process.env.AI_MODEL ?? "gemini-2.5-flash",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  openRouterModel: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
  aiReady: Boolean(doublewordApiKeys.length || geminiApiKeys.length || groqApiKeys.length || openRouterApiKeys.length),
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  demoModeEnabled: process.env.DEMO_MODE_ENABLED === "true",
  isConfigured: Boolean(url && anonKey),
};

// Authoritative environment check
if (typeof window === "undefined" && !env.isConfigured && process.env.NODE_ENV !== "production") {
  console.warn("⚠️  [TRACKNOV ENV] Supabase URL or Anon Key is missing. Platform functionality will be restricted.");
}
