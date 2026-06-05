import { env } from "@/lib/env";
import { type AssistantContext, type AssistantMessage, buildAssistantSystemPrompt } from "@tracknov/harita-engine/assistant";
import { toGeminiTools, toOpenAiTools } from "@tracknov/harita-engine/assistant-tools";
import {
  type AiProvider,
  type ProviderAttempt,
  toGeminiContents,
  toChatMessages,
  extractFunctionCalls,
  extractText,
  extractOpenAiFunctionCalls,
} from "./stream-utils";

export function buildProviderAttempts(): ProviderAttempt[] {
  const configuredOrder: AiProvider[] = ["ollama", "doubleword", "gemini", "groq", "openrouter"];
  const requestedProvider = env.aiProvider.toLowerCase();
  const order = configuredOrder.includes(requestedProvider as AiProvider)
    ? [requestedProvider as AiProvider, ...configuredOrder.filter((provider) => provider !== requestedProvider)]
    : configuredOrder;

  const keysByProvider: Record<AiProvider, string[]> = {
    ollama: ["local"],
    doubleword: env.doublewordApiKeys,
    gemini: env.geminiApiKeys,
    groq: env.groqApiKeys,
    openrouter: env.openRouterApiKeys,
  };
  const modelByProvider: Record<AiProvider, string> = {
    ollama: env.ollamaModel || "gemma2",
    doubleword: env.doublewordModel,
    gemini: env.geminiModel,
    groq: env.groqModel,
    openrouter: env.openRouterModel,
  };

  return order.flatMap((provider) =>
    (keysByProvider[provider] || []).map((apiKey) => ({
      provider,
      model: modelByProvider[provider],
      apiKey,
    })),
  );
}

export async function callGeminiWithTools(
  context: AssistantContext,
  messages: AssistantMessage[],
  workspaceSnapshot: string,
  role: string,
  attempt: ProviderAttempt,
): Promise<{ type: "function_call"; calls: Array<{ name: string; args: Record<string, unknown> }> } | { type: "content"; text: string } | null> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${attempt.model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": attempt.apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildAssistantSystemPrompt(context, workspaceSnapshot, role) }],
      },
      contents: toGeminiContents(messages),
      tools: toGeminiTools(),
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1200,
      },
    }),
  });

  if (!response.ok) return null;

  const data = await response.json() as any;
  const functionCalls = extractFunctionCalls(data);
  if (functionCalls.length > 0) {
    return { type: "function_call", calls: functionCalls };
  }

  const text = extractText(data);
  if (text) {
    return { type: "content", text };
  }
  return null;
}

function openAiCompatibleEndpoint(provider: AiProvider) {
  if (provider === "ollama") {
    return env.ollamaUrl || "http://192.168.29.48:11434/v1/chat/completions";
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

function openAiHeaders(attempt: ProviderAttempt): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (attempt.provider !== "ollama") {
    headers["Authorization"] = `Bearer ${attempt.apiKey}`;
  }
  if (attempt.provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://tracknov.app";
    headers["X-Title"] = "Tracknov";
  }
  return headers;
}

export async function callOpenAiWithTools(
  context: AssistantContext,
  messages: AssistantMessage[],
  workspaceSnapshot: string,
  role: string,
  attempt: ProviderAttempt,
): Promise<{ type: "function_call"; calls: Array<{ name: string; args: Record<string, unknown> }> } | { type: "content"; text: string } | null> {
  const response = await fetch(openAiCompatibleEndpoint(attempt.provider), {
    method: "POST",
    headers: openAiHeaders(attempt),
    body: JSON.stringify({
      model: attempt.model,
      messages: toChatMessages(context, messages, workspaceSnapshot, role),
      tools: toOpenAiTools(),
      temperature: 0.4,
      max_tokens: 300,
      stream: false,
    }),
  });

  if (!response.ok) return null;

  const data = await response.json() as any;
  const functionCalls = extractOpenAiFunctionCalls(data);
  if (functionCalls.length > 0) {
    return { type: "function_call", calls: functionCalls };
  }

  const text = data?.choices?.[0]?.message?.content ?? "";
  if (text) {
    return { type: "content", text };
  }

  return null;
}

export async function tryDetectFunctionCalls(
  context: AssistantContext,
  messages: AssistantMessage[],
  workspaceSnapshot: string,
  role: string,
): Promise<Array<{ name: string; args: Record<string, unknown> }> | null> {
  const attempts = buildProviderAttempts();
  for (const attempt of attempts) {
    try {
      const result = attempt.provider === "gemini"
        ? await callGeminiWithTools(context, messages, workspaceSnapshot, role, attempt)
        : await callOpenAiWithTools(context, messages, workspaceSnapshot, role, attempt);

      if (result?.type === "function_call") {
        return result.calls;
      }
      if (result?.type === "content") {
        return [];
      }
    } catch (error) {
      console.warn(`[Assistant] Tool detection ${attempt.provider} failed; trying next.`, error);
    }
  }
  return null;
}
