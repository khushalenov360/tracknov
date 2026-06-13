import { createClient } from "@/lib/supabase/server";
import { haritaRuntimeService } from "@/lib/harita-engine/services/harita-runtime-service";
import {
  sanitizeAiResponse,
  filterTechnicalLeakage,
  containsAuthoritativeClaim,
  getAuthoritativeClaimRefusal,
  getUnknownDataResponse,
  normalizeHaritaResponse,
} from "@/lib/harita-engine/services/harita-governance";
import { hasFailureSignature } from "./guardrail-signatures";

export function applyResponseGovernance(inputStream: ReadableStream<Uint8Array>, sessionId?: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = inputStream.getReader();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }
      fullText += decoder.decode();

      const words = fullText.split(/\s+/).filter(Boolean);
      const tokenCount = words.length;

      if (hasFailureSignature(fullText)) {
        if (tokenCount <= 40) {
          // Early failure -> Send RESET_STREAM control packet
          controller.enqueue(encoder.encode(JSON.stringify({ type: "control", action: "RESET_STREAM" }) + "\n"));
          controller.close();
          return;
        } else {
          // Late failure -> Send WARNING control packet + governed tokens
          let safe = sanitizeAiResponse(fullText);
          safe = filterTechnicalLeakage(safe);
          if (containsAuthoritativeClaim(safe)) {
            safe = getAuthoritativeClaimRefusal();
          }
          // Strip prefixes
          safe = safe.replace(/(?:^|\n)\*{0,2}(Direct Answer|Consultant Assessment|Answer)\*{0,2}\s*:\s*/gi, (match) => {
            return match.startsWith("\n") ? "\n" : "";
          });
          safe = safe.replace(/([.!?])\s*\*{0,2}(Direct Answer|Consultant Assessment)\*{0,2}\s*:\s*/gi, "$1 ");

          if (sessionId) {
            void haritaRuntimeService.storeMessage(sessionId, "assistant", safe).catch(() => {});
          }

          controller.enqueue(encoder.encode(JSON.stringify({
            type: "control",
            action: "WARNING",
            message: "Warning: Harita detected a potential system instruction or persona violation mid-stream."
          }) + "\n"));
          controller.enqueue(encoder.encode(JSON.stringify({ type: "token", content: safe }) + "\n"));
          controller.close();
          return;
        }
      }

      // Normal response
      let safe = sanitizeAiResponse(fullText);
      safe = filterTechnicalLeakage(safe);
      if (containsAuthoritativeClaim(safe)) {
        safe = getAuthoritativeClaimRefusal();
      }
      
      // Strip banned response prefixes that the LLM may still produce (anywhere in text, including mid-sentence)
      // Pattern 1: At line start (with or without bold markers)
      safe = safe.replace(/(?:^|\n)\*{0,2}(Direct Answer|Consultant Assessment|Answer)\*{0,2}\s*:\s*/gi, (match) => {
        return match.startsWith("\n") ? "\n" : "";
      });
      // Pattern 2: Mid-sentence after punctuation e.g. '." Direct Answer: ...'
      safe = safe.replace(/([.!?])\s*\*{0,2}(Direct Answer|Consultant Assessment)\*{0,2}\s*:\s*/gi, "$1 ");

      if (sessionId) {
        void haritaRuntimeService.storeMessage(sessionId, "assistant", safe).catch(() => {});
      }

      controller.enqueue(encoder.encode(JSON.stringify({ type: "token", content: safe }) + "\n"));
      controller.close();
    },
  });
}

export async function logAiInteraction(params: {
  userId: string;
  intent: string;
  query: string;
  model: string;
  contextSize: number;
  tokenUsage: number;
  fallbackUsed: boolean;
  latencyMs: number;
}) {
  try {
    const client = createClient();
    await client.from("ai_interactions").insert({
      user_id: params.userId,
      intent: params.intent,
      query: params.query.slice(0, 4000),
      model: params.model,
      context_size: params.contextSize,
      token_usage: params.tokenUsage,
      fallback_used: params.fallbackUsed,
      latency_ms: params.latencyMs,
    });
  } catch {
    // no-op
  }
}

export function tryDeterministicAnswer(intent: string, snapshot: string) {
  if (!snapshot?.trim()) {
    return null;
  }
  if (intent === "status") {
    const projectLines = snapshot
      .split("\n")
      .filter((line) => line.startsWith("Project "))
      .slice(0, 6);
    if (!projectLines.length) {
      return normalizeHaritaResponse({
        assessment: getUnknownDataResponse(),
        fit: "Not suitable",
        reason: "No project lines found in your accessible data.",
        recommendation: "Open a project workspace and try again.",
        confirm: "Confirm?",
      });
    }
    return normalizeHaritaResponse({
      assessment: `I found ${projectLines.length} active project snapshots in your accessible workspace.`,
      fit: "Strong",
      reason: projectLines.join(" | "),
      recommendation: "Tell me one project name/code and I will give exact pending counts and next action.",
      confirm: "Confirm?",
    });
  }
  if (intent === "workflow") {
    const workflowHints = snapshot
      .split("\n")
      .filter((line) => line.toLowerCase().includes("documents:") || line.toLowerCase().includes("credits:"))
      .slice(0, 4)
      .join(" | ");
    return normalizeHaritaResponse({
      assessment: workflowHints || getUnknownDataResponse(),
      fit: workflowHints ? "Medium" : "Not suitable",
      reason: workflowHints || "Workflow counters are not present in the current snapshot.",
      recommendation: "Ask: 'show workflow status for <project>' for a focused breakdown.",
      confirm: "Confirm?",
    });
  }
  if (intent === "validation") {
    const hasValidation = snapshot.toLowerCase().includes("required:");
    return normalizeHaritaResponse({
      assessment: hasValidation
        ? "Validation requirements are present in current tracker/credit context."
        : getUnknownDataResponse(),
      fit: hasValidation ? "Medium" : "Not suitable",
      reason: hasValidation
        ? "I can see credit requirement rows in the workspace snapshot."
        : "No validation requirement rows were found in the current context.",
      recommendation: hasValidation
        ? "Share the target credit code and document type so I can validate mapping readiness."
        : "Upload tracker or open a project with instantiated credits.",
      confirm: "Confirm?",
    });
  }
  return null;
}
