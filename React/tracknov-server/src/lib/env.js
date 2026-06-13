"use strict";
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
// Environment variables are automatically loaded by Next.js
// using process.env during build and runtime.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
// In Next.js 15, explicit access to process.env is preferred for static optimization and Edge compatibility.
const geminiApiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const doublewordApiKeys = (process.env.DOUBLEWORD_API_KEYS || process.env.DOUBLEWORD_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const groqApiKeys = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const openRouterApiKeys = (process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const openAiApiKeys = (process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
exports.env = {
    doublewordApiKeys,
    geminiApiKeys,
    groqApiKeys,
    openRouterApiKeys,
    openAiApiKeys,
    geminiApiKey: (_a = geminiApiKeys[0]) !== null && _a !== void 0 ? _a : "",
    aiProvider: (_b = process.env.AI_PROVIDER) !== null && _b !== void 0 ? _b : "auto",
    aiModel: (_c = process.env.AI_MODEL) !== null && _c !== void 0 ? _c : "",
    doublewordModel: (_d = process.env.DOUBLEWORD_MODEL) !== null && _d !== void 0 ? _d : "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8",
    geminiModel: (_f = (_e = process.env.GEMINI_MODEL) !== null && _e !== void 0 ? _e : process.env.AI_MODEL) !== null && _f !== void 0 ? _f : "gemini-2.5-flash",
    groqModel: (_g = process.env.GROQ_MODEL) !== null && _g !== void 0 ? _g : "llama-3.3-70b-versatile",
    openAiModel: (_h = process.env.OPENAI_MODEL) !== null && _h !== void 0 ? _h : "gpt-4o-mini",
    openRouterModel: (_j = process.env.OPENROUTER_MODEL) !== null && _j !== void 0 ? _j : "openai/gpt-4o-mini",
    ollamaModel: (_k = process.env.OLLAMA_MODEL) !== null && _k !== void 0 ? _k : "llama3.2:1b",
    ollamaUrl: (_l = process.env.OLLAMA_URL) !== null && _l !== void 0 ? _l : "http://192.168.29.48:11434/v1/chat/completions",
    aiReady: Boolean(doublewordApiKeys.length || geminiApiKeys.length || groqApiKeys.length || openRouterApiKeys.length || openAiApiKeys.length || process.env.OLLAMA_URL),
    supabaseUrl: url,
    supabaseAnonKey: anonKey,
    supabaseServiceRoleKey: (_m = process.env.SUPABASE_SERVICE_ROLE_KEY) !== null && _m !== void 0 ? _m : "",
    demoModeEnabled: process.env.DEMO_MODE_ENABLED === "true",
    isConfigured: Boolean(url && anonKey),
};
const env_config_1 = require("./env-config");
// Authoritative environment check
if (typeof window === "undefined") {
    if (!exports.env.isConfigured && !env_config_1.envConfig.isDevelopment) {
        throw new Error("🚨 FATAL: Supabase configuration missing in non-development environment.");
    }
    if (env_config_1.envConfig.isProduction) {
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
