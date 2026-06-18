"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProviderAttempts = buildProviderAttempts;
exports.callGeminiWithTools = callGeminiWithTools;
exports.callOpenAiWithTools = callOpenAiWithTools;
exports.tryDetectFunctionCalls = tryDetectFunctionCalls;
const env_1 = require("@/lib/env");
const assistant_1 = require("@/lib/harita-engine/assistant");
const assistant_tools_1 = require("@/lib/harita-engine/assistant-tools");
const stream_utils_1 = require("./stream-utils");
function buildProviderAttempts() {
    const configuredOrder = ["ollama", "gemini", "groq", "openrouter", "doubleword"];
    const requestedProvider = env_1.env.aiProvider.toLowerCase();
    const order = configuredOrder.includes(requestedProvider)
        ? [requestedProvider, ...configuredOrder.filter((provider) => provider !== requestedProvider)]
        : configuredOrder;
    const keysByProvider = {
        ollama: env_1.env.ollamaToolModel ? ["local"] : [],
        doubleword: env_1.env.doublewordApiKeys,
        gemini: env_1.env.geminiApiKeys,
        groq: env_1.env.groqApiKeys,
        openrouter: env_1.env.openRouterApiKeys,
    };
    const modelByProvider = {
        ollama: env_1.env.ollamaToolModel,
        doubleword: env_1.env.doublewordModel,
        gemini: env_1.env.geminiModel,
        groq: env_1.env.groqModel,
        openrouter: env_1.env.openRouterModel,
    };
    return order.flatMap((provider) => (keysByProvider[provider] || []).map((apiKey) => ({
        provider,
        model: modelByProvider[provider],
        apiKey,
    })));
}
function callGeminiWithTools(context, messages, workspaceSnapshot, role, attempt) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(`https://generativelanguage.googleapis.com/v1beta/models/${attempt.model}:generateContent`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": attempt.apiKey,
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: (0, assistant_1.buildAssistantSystemPrompt)(context, workspaceSnapshot, role) }],
                },
                contents: (0, stream_utils_1.toGeminiContents)(messages),
                tools: (0, assistant_tools_1.toGeminiTools)(),
                generationConfig: {
                    temperature: 0.2,
                    topP: 0.9,
                    topK: 40,
                    maxOutputTokens: 1200,
                },
            }),
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
            console.error(`[Assistant] Gemini tool detection failed: HTTP ${response.status} - ${yield response.text().catch(() => "no body")}`);
            return null;
        }
        const data = yield response.json();
        const functionCalls = (0, stream_utils_1.extractFunctionCalls)(data);
        if (functionCalls.length > 0) {
            return { type: "function_call", calls: functionCalls };
        }
        const text = (0, stream_utils_1.extractText)(data);
        if (text) {
            return { type: "content", text };
        }
        return null;
    });
}
function openAiCompatibleEndpoint(provider) {
    if (provider === "ollama") {
        return env_1.env.ollamaUrl || "http://192.168.29.48:11434/v1/chat/completions";
    }
    if (provider === "doubleword") {
        return "https://api.doubleword.ai/v1/chat/completions";
    }
    if (provider === "groq") {
        return "https://api.groq.com/openai/v1/chat/completions";
    }
    if (provider === "openrouter") {
        return "https://openrouter.ai/api/v1/chat/completions";
    }
    throw new Error(`Unsupported OpenAI-compatible provider: ${provider}`);
}
function openAiHeaders(attempt) {
    var _a, _b;
    const headers = {
        "Content-Type": "application/json"
    };
    if (attempt.provider !== "ollama") {
        headers["Authorization"] = `Bearer ${attempt.apiKey}`;
    }
    if (attempt.provider === "openrouter") {
        headers["HTTP-Referer"] = (_b = (_a = process.env.APP_URL) !== null && _a !== void 0 ? _a : process.env.SITE_URL) !== null && _b !== void 0 ? _b : "https://tracknov.app";
        headers["X-Title"] = "Tracknov";
    }
    return headers;
}
function callOpenAiWithTools(context, messages, workspaceSnapshot, role, attempt) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const response = yield fetch(openAiCompatibleEndpoint(attempt.provider), {
            method: "POST",
            headers: openAiHeaders(attempt),
            body: JSON.stringify({
                model: attempt.model,
                messages: (0, stream_utils_1.toChatMessages)(context, messages, workspaceSnapshot, role),
                tools: (0, assistant_tools_1.toOpenAiTools)(),
                temperature: 0.4,
                max_tokens: 300,
                stream: false,
            }),
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
            console.error(`[Assistant] openAiCompatible (${attempt.provider}) failed: HTTP ${response.status} - ${yield response.text().catch(() => "no body")}`);
            return null;
        }
        const data = yield response.json();
        const functionCalls = (0, stream_utils_1.extractOpenAiFunctionCalls)(data);
        if (functionCalls.length > 0) {
            return { type: "function_call", calls: functionCalls };
        }
        const text = (_d = (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) !== null && _d !== void 0 ? _d : "";
        if (text) {
            return { type: "content", text };
        }
        return null;
    });
}
function tryDetectFunctionCalls(context, messages, workspaceSnapshot, role) {
    return __awaiter(this, void 0, void 0, function* () {
        const attempts = buildProviderAttempts();
        for (const attempt of attempts) {
            try {
                const result = attempt.provider === "gemini"
                    ? yield callGeminiWithTools(context, messages, workspaceSnapshot, role, attempt)
                    : yield callOpenAiWithTools(context, messages, workspaceSnapshot, role, attempt);
                if ((result === null || result === void 0 ? void 0 : result.type) === "function_call") {
                    return result.calls;
                }
                if ((result === null || result === void 0 ? void 0 : result.type) === "content") {
                    return [];
                }
            }
            catch (error) {
                console.warn(`[Assistant] Tool detection ${attempt.provider} failed; trying next.`, error);
            }
        }
        return null;
    });
}
