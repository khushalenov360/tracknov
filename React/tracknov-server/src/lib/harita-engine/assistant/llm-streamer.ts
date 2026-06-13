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
import { toOpenAiTools } from "../assistant-tools";

// ---------------------------------------------------------------------------
// Provider descriptor
// ---------------------------------------------------------------------------

interface ProviderConfig {
  id: string;
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
  const requestedProvider = env.aiProvider?.toLowerCase() || "auto";

  // Build the list of available providers
  const availableProviders: ProviderConfig[] = [];

  const ollamaUrl = env.ollamaUrl || "http://192.168.29.48:11434/v1/chat/completions";
  if (ollamaUrl) {
    availableProviders.push({
      id: "ollama",
      name: `Local (Gemma 3)`,
      call: (sp, _contents) =>
        fetch(ollamaUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: env.ollamaModel || "gemma3",
            // Truncate the massive system prompt (which contains the full workspace) to 6000 chars for local Ollama
            // to prevent 2+ minute prompt evaluation times on consumer hardware.
            messages: [{ role: "system", content: sp.slice(0, 6000) }, ...geminiContents.map(c => ({ role: c.role === "model" ? "assistant" : "user", content: c.parts ? c.parts.map((p: any) => p.text || "").join("") : c.content || "" }))],
            temperature: 0.4,
            max_tokens: 1200,
            stream: true,
            tools: toOpenAiTools(),
          }),
          signal: AbortSignal.timeout(30000),
        }),
      parseStream: buildOpenAiStream,
      isRetryable: (s) => s >= 500,
    });
  }

  // ── 0. Atomesus (primary) ────────────────────────────────────────────────
  const atomesusKey = process.env.ATOMESUS_API_KEY;
  if (atomesusKey) {
    availableProviders.push({
      id: "atomesus",
      name: "Atomesus (Cipher 8B)",
      call: (sp, contents) =>
        fetch("https://api.atomesus.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${atomesusKey}`,
          },
          body: JSON.stringify({
            model: "cipher-8b",
            messages: [
              { role: "user", content: sp },
              { role: "assistant", content: "Understood. I will act as Harita and follow these instructions strictly." },
              ...contents.map(c => ({ role: c.role === "model" ? "assistant" : "user", content: c.parts ? c.parts.map((p: any) => p.text || "").join("") : c.content || "" }))
            ],
            temperature: 0.4,
            max_tokens: 1200,
            stream: true,
            tools: toOpenAiTools(),
          }),
          signal: AbortSignal.timeout(30000),
        }),
      parseStream: buildOpenAiStream,
      isRetryable: (s) => s === 429 || s >= 500,
    });
  }

  // ── 1. Gemini 2.5 Flash ────────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY || env.geminiApiKeys?.[0];
  if (geminiKey) {
    availableProviders.push({
      id: "gemini",
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
            signal: AbortSignal.timeout(30000),
          }
        );
      },
      parseStream: buildGeminiStream,
      isRetryable: (s) => s === 429 || s >= 500,
    });
  }

  // ── 3. Groq Llama-3.3-70b ──────────────────────────────────────────────
  const groqKey = process.env.GROQ_API_KEY || env.groqApiKeys?.[0];
  if (groqKey) {
    availableProviders.push({
      id: "groq",
      name: "Groq (llama-3.3-70b-versatile)",
      call: (sp, contents) =>
        fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: sp }, ...contents.map(c => ({ role: c.role === "model" ? "assistant" : "user", content: c.parts ? c.parts.map((p: any) => p.text || "").join("") : c.content || "" }))],
            temperature: 0.4,
            max_tokens: 1200,
            stream: true,
            tools: toOpenAiTools(),
          }),
          signal: AbortSignal.timeout(30000),
        }),
      parseStream: buildOpenAiStream,
      isRetryable: (s) => s === 429 || s >= 500,
    });
  }

  // ── 4. OpenRouter ──────────────────────────────────────────────────────
  const orKey = process.env.OPENROUTER_API_KEY || env.openRouterApiKeys?.[0];
  if (orKey) {
    availableProviders.push({
      id: "openrouter",
      name: "OpenRouter (Claude/Mistral fallback)",
      call: (sp, contents) =>
        fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${orKey}`,
          },
          body: JSON.stringify({
            model: env.openRouterModel || "meta-llama/llama-3.3-70b-instruct",
            messages: [{ role: "system", content: sp }, ...contents.map(c => ({ role: c.role === "model" ? "assistant" : "user", content: c.parts ? c.parts.map((p: any) => p.text || "").join("") : c.content || "" }))],
            temperature: 0.4,
            max_tokens: 1200,
            stream: true,
            tools: toOpenAiTools(),
          }),
          signal: AbortSignal.timeout(30000),
        }),
      parseStream: buildOpenAiStream,
      isRetryable: (s) => s === 429 || s >= 500,
    });
  }

  // Finalize chain ordering based on requested provider
  const primaryProvider = availableProviders.find(p => p.id === requestedProvider);
  
  if (primaryProvider) {
    const restProviders = availableProviders
      .filter(p => p.id !== requestedProvider)
      .sort((a, b) => {
        if (a.id === "ollama") return 1;
        if (b.id === "ollama") return -1;
        return 0;
      });
    chain.push(primaryProvider);
    chain.push(...restProviders);
  } else {
    // If auto or invalid provider, prioritize Atomesus, then OpenAI, then others
    const gemini = availableProviders.find(p => p.id === "gemini");
    if (gemini) chain.push(gemini);

    const ollama = availableProviders.find(p => p.id === "ollama");
    if (ollama) chain.push(ollama);
    
    const atomesus = availableProviders.find(p => p.id === "atomesus");
    if (atomesus) chain.push(atomesus);

    const openai = availableProviders.find(p => p.id === "openai");
    if (openai) chain.push(openai);
    
    const rest = availableProviders.filter(p => !["gemini", "ollama", "atomesus", "openai"].includes(p.id));
    chain.push(...rest);
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
  functionResults?: Array<{ name: string; response: unknown }>,
  systemPromptOverride?: string
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = systemPromptOverride || buildAssistantSystemPrompt(context, workspaceSnapshot, role);

  let geminiContents: any[] = messages.map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    // const compressionResult = await compress(geminiContents, { 
    //   model: "gemini-2.5-flash", 
    //   fallback: true 
    // });
    // geminiContents = compressionResult.messages || geminiContents;
    // if (process.env.HARITA_DEBUG === "true" && compressionResult.tokensSaved) {
    //   console.log(`[Headroom] Saved ${compressionResult.tokensSaved} tokens (${compressionResult.savingsPercent?.toFixed(1)}%)`);
    // }
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
    // const compressionResult = await compress(geminiContents, { 
    //   model: "gemini-2.5-flash", 
    //   fallback: true 
    // });
    // geminiContents = compressionResult.messages || geminiContents;
  } catch (err) {
    // Ignore compression errors and proceed with original context
  }

  // Try every Gemini key available (supports multiple keys for higher quota)
  for (const apiKey of [process.env.GEMINI_API_KEY, ...(env.geminiApiKeys || [])].filter(Boolean)) {
    // Try primary model first, then fallback model
    for (const model of ["gemini-2.5-flash", "gemini-3.5-flash"]) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey as string },
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
