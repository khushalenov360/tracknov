const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function readKeys(primaryName: string, legacyName?: string) {
  const raw = process.env[primaryName] || (legacyName ? process.env[legacyName] : "") || "";
  return raw
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

const doublewordApiKeys = readKeys("DOUBLEWORD_API_KEYS", "DOUBLEWORD_API_KEY");
const geminiApiKeys = readKeys("GEMINI_API_KEYS", "GEMINI_API_KEY");
const groqApiKeys = readKeys("GROQ_API_KEYS", "GROQ_API_KEY");
const openRouterApiKeys = readKeys("OPENROUTER_API_KEYS", "OPENROUTER_API_KEY");

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
