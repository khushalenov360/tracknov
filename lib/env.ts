const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const env = {
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  aiProvider: process.env.AI_PROVIDER ?? "gemini",
  aiModel: process.env.AI_MODEL ?? "gemini-2.5-flash",
  aiReady: Boolean(process.env.GEMINI_API_KEY),
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  isConfigured: Boolean(url && anonKey),
};
