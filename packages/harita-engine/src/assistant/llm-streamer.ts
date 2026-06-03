// ============================================================
// LLM Streamer — Multi-Provider Fallback
// ============================================================
// Fallback chain (in priority order):
//   1. Gemini 2.5 Flash      (fast, primary)
//   2. Gemini 1.5 Flash      (higher daily quota, same infra)
//   3. Groq Llama-3.3-70b    (independent infrastructure, very fast)
//   4. OpenRouter GPT-4o-mini (independent, emergency fallback)
//
// When a provider returns 429 (quota) or 5xx (outage), the next
// provider is tried automatically. Users never see a failure
// unless every provider in the chain is simultaneously down.
// ============================================================

import { env } from "@/lib/env";
import { buildAssistantSystemPrompt } from "../assistant";
import { compress } from "headroom-ai";

// ---------------------------------------------------------------------------
// Provider descriptor
// ---------------------------------------------------------------------------

interface ProviderConfig {
  name: string;
  call: (
    systemPrompt: string,
    contents: any[],
    functionResults?: Array<{ name: string; response: unknown }>
  ) => Promise<Response>;
  parseStream: (response: Response) => ReadableStream<Uint8Array>;
  isRetryable: (status: number) => boolean;
}

// ---------------------------------------------------------------------------
// SSE stream parser — shared between Gemini providers
// ---------------------------------------------------------------------------

function buildGeminiStream(response: Response): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = response.body!.getReader();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";
      let lastText = "";

      const emitText = (currentText: string) => {
        const nextChunk = currentText.startsWith(lastText)
          ? currentText.slice(lastText.length)
          : currentText;
        if (nextChunk) {
          const safeChunk = nextChunk.replace(/\[\[.*\]\]/g, "");
          if (safeChunk) controller.enqueue(encoder.encode(safeChunk));
        }
        lastText = currentText;
      };

      const processEvent = (eventBlock: string) => {
        const dataLines = eventBlock
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim());

        for (const line of dataLines) {
          if (!line || line === "[DONE]") continue;
          try {
            const parsed = JSON.parse(line);
            const parts = parsed.candidates?.[0]?.content?.parts;
            if (Array.isArray(parts)) {
              const currentText = parts.map((p: any) => p.text ?? "").join("");
              if (currentText) emitText(currentText);
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let sep = buffer.indexOf("\n\n");
          while (sep !== -1) {
            const block = buffer.slice(0, sep).trim();
            buffer = buffer.slice(sep + 2);
            if (block) processEvent(block);
            sep = buffer.indexOf("\n\n");
          }
        }
        if (buffer.trim()) processEvent(buffer.trim());
        controller.close();
      } catch (e) {
        controller.error(e);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// OpenAI-compatible stream parser (Groq / OpenRouter)
// ---------------------------------------------------------------------------

function buildOpenAiStream(response: Response): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = response.body!.getReader();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";

      const processLine = (line: string) => {
        if (!line || line === "[DONE]") return;
        try {
          const parsed = JSON.parse(line);
          const delta = parsed.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            const safe = delta.replace(/\[\[.*\]\]/g, "");
            if (safe) controller.enqueue(encoder.encode(safe));
          }
        } catch {
          // ignore
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const raw of lines) {
            const line = raw.replace(/^data:\s*/, "").trim();
            if (line) processLine(line);
          }
        }
        if (buffer.trim()) processLine(buffer.replace(/^data:\s*/, "").trim());
        controller.close();
      } catch (e) {
        controller.error(e);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Build the ordered fallback chain
// ---------------------------------------------------------------------------

function buildFallbackChain(
  systemPrompt: string,
  geminiContents: any[]
): ProviderConfig[] {
  const chain: ProviderConfig[] = [];

  // ── 1. Gemini 2.5 Flash (primary) ──────────────────────────────────────
  const geminiKey = env.geminiApiKeys[0];
  if (geminiKey) {
    chain.push({
      name: "Gemini 2.5 Flash",
      call: (sp, contents, fnResults) => {
        const body: any = {
          systemInstruction: { parts: [{ text: sp }] },
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
        };
        if (fnResults?.length) {
          body.contents = [
            ...contents,
            {
              role: "model",
              parts: fnResults.map((fc) => ({ functionCall: { name: fc.name, args: {} } })),
            },
            {
              role: "function",
              parts: fnResults.map((fc) => ({
                functionResponse: { name: fc.name, response: { result: fc.response } },
              })),
            },
          ];
        }
        return fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
            body: JSON.stringify(body),
          }
        );
      },
      parseStream: buildGeminiStream,
      isRetryable: (s) => s === 429 || s >= 500,
    });
  }

  // ── 2. Gemini 1.5 Flash (secondary — higher free-tier quota) ───────────
  // Uses the same API key but a different model with a separate quota bucket.
  if (geminiKey) {
    chain.push({
      name: "Gemini 1.5 Flash",
      call: (sp, contents) =>
        fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: sp }] },
              contents,
              generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
            }),
          }
        ),
      parseStream: buildGeminiStream,
      isRetryable: (s) => s === 429 || s >= 500,
    });
  }

  // ── 3. Groq Llama-3.3-70b (independent infra, extremely fast) ──────────
  const groqKey = env.groqApiKeys[0];
  if (groqKey) {
    chain.push({
      name: "Groq Llama-3.3-70b",
      call: (sp, _contents) =>
        fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: env.groqModel || "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: sp }],
            temperature: 0.4,
            max_tokens: 1200,
            stream: true,
          }),
        }),
      parseStream: buildOpenAiStream,
      isRetryable: (s) => s === 429 || s >= 500,
    });
  }

  // ── 4. OpenAI GPT-4o-mini (direct, independent infra) ─────────────────
  const openAiKey = env.openAiApiKeys[0];
  if (openAiKey) {
    chain.push({
      name: "OpenAI GPT-4o-mini",
      call: (sp, _contents) =>
        fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: env.openAiModel || "gpt-4o-mini",
            messages: [{ role: "system", content: sp }],
            temperature: 0.4,
            max_tokens: 1200,
            stream: true,
          }),
        }),
      parseStream: buildOpenAiStream,
      isRetryable: (s) => s === 429 || s >= 500,
    });
  }

  // ── 5. OpenRouter (last resort, any key available) ─────────────────────
  const openRouterKey = env.openRouterApiKeys[0];
  if (openRouterKey) {
    chain.push({
      name: "OpenRouter GPT-4o-mini",
      call: (sp, _contents) =>
        fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterKey}`,
            "HTTP-Referer": "https://tracknov.app",
            "X-Title": "Tracknov",
          },
          body: JSON.stringify({
            model: env.openRouterModel || "openai/gpt-4o-mini",
            messages: [{ role: "system", content: sp }],
            temperature: 0.4,
            max_tokens: 1200,
            stream: true,
          }),
        }),
      parseStream: buildOpenAiStream,
      isRetryable: (s) => s === 429 || s >= 500,
    });
  }

  return chain;
}

// ---------------------------------------------------------------------------
// Public API: createAiStream
// ---------------------------------------------------------------------------

export async function createAiStream(
  context: any,
  messages: any[],
  workspaceSnapshot: string,
  role?: string,
  functionResults?: Array<{ name: string; response: unknown }>
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = buildAssistantSystemPrompt(context, workspaceSnapshot, role);

  let geminiContents: any[] = messages.map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const compressionResult = await compress(geminiContents, { 
      model: "gemini-2.5-flash", 
      fallback: true 
    });
    geminiContents = compressionResult.messages || geminiContents;
    if (process.env.HARITA_DEBUG === "true" && compressionResult.tokensSaved) {
      console.log(`[Headroom] Saved ${compressionResult.tokensSaved} tokens (${compressionResult.savingsPercent?.toFixed(1)}%)`);
    }
  } catch (err) {
    if (process.env.HARITA_DEBUG === "true") {
      console.warn(`[Headroom] Compression warning:`, err);
    }
  }

  const chain = buildFallbackChain(systemPrompt, geminiContents);

  if (chain.length === 0) {
    throw new Error(
      "No AI providers configured. Set at least one of: GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY in .env.local"
    );
  }

  const errors: string[] = [];

  for (const provider of chain) {
    try {
      if (process.env.HARITA_DEBUG === "true") {
        console.log(`[LLM] Trying provider: ${provider.name}`);
      }

      const response = await provider.call(systemPrompt, geminiContents, functionResults);

      if (!response.ok) {
        const errorText = await response.text();
        const isQuota = response.status === 429;
        const msg = `${provider.name} → HTTP ${response.status}${isQuota ? " (quota)" : ""}: ${errorText.slice(0, 200)}`;
        console.warn(`[LLM] ${msg}`);
        errors.push(msg);

        if (!provider.isRetryable(response.status)) {
          // Non-retryable error (e.g. 401 bad key) — skip to next provider
        }
        continue;
      }

      // Success — return the parsed stream
      if (process.env.HARITA_DEBUG === "true") {
        console.log(`[LLM] Using provider: ${provider.name}`);
      }
      return provider.parseStream(response);

    } catch (err: any) {
      const msg = `${provider.name} → Network error: ${err?.message ?? String(err)}`;
      console.warn(`[LLM] ${msg}`);
      errors.push(msg);
    }
  }

  // All providers exhausted
  throw new Error(
    `All AI providers failed.\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n")}`
  );
}

// ---------------------------------------------------------------------------
// Public API: tryDetectFunctionCalls
// Still Gemini-first (function calling needs structured tool support).
// Falls back to returning null so the pipeline continues without tools.
// ---------------------------------------------------------------------------

export async function tryDetectFunctionCalls(
  context: any,
  messages: any[],
  workspaceSnapshot: string,
  role: string,
): Promise<Array<{ name: string; args: Record<string, unknown> }> | null> {
  const { toGeminiTools } = await import("../assistant-tools");

  const systemPrompt = buildAssistantSystemPrompt(context, workspaceSnapshot, role);
  let geminiContents: any[] = messages.map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const compressionResult = await compress(geminiContents, { 
      model: "gemini-2.5-flash", 
      fallback: true 
    });
    geminiContents = compressionResult.messages || geminiContents;
  } catch (err) {
    // Ignore compression errors and proceed with original context
  }

  // Try every Gemini key available (supports multiple keys for higher quota)
  for (const apiKey of env.geminiApiKeys) {
    // Try primary model first, then fallback model
    for (const model of ["gemini-2.5-flash", "gemini-1.5-flash"]) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: geminiContents,
              tools: toGeminiTools(),
              generationConfig: { temperature: 0.1 },
            }),
          }
        );

        if (!response.ok) continue;

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts;

        if (Array.isArray(parts)) {
          const functionCalls = parts
            .filter((p: any) => p.functionCall)
            .map((p: any) => ({ name: p.functionCall.name, args: p.functionCall.args || {} }));
          if (functionCalls.length > 0) return functionCalls;
        }

        // Non-function response — no tool call needed
        return null;
      } catch {
        // try next
      }
    }
  }

  // Tool detection completely failed — proceed without function calls
  return null;
}
