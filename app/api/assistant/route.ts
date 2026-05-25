import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildAssistantSystemPrompt,
  buildFallbackAssistantReply,
  type AssistantContext,
  type AssistantMessage,
} from "@/lib/assistant";
import { ragService } from "@/lib/services/rag-service";
import { toneService, type AssistantTone } from "@/lib/services/tone-service";
import { sessionMemory } from "@/lib/services/session-memory-service";
import { knowledgeEngine } from "@/lib/services/knowledge-engine";
import {
  getUnknownDataResponse,
  normalizeHaritaResponse,
  requiresExplicitConfirmationForExecution,
  routeHaritaIntent,
  semanticDisambiguateIntent,
  requiresToolCall,
  sanitizeContextText,
  sanitizeUserText,
  sanitizeAiResponse,
  filterTechnicalLeakage,
  containsAuthoritativeClaim,
  getAuthoritativeClaimRefusal,
} from "@/lib/services/harita-governance";
import { certificationStrategyEngine } from "@/lib/services/certification-strategy-engine";
import { submissionReadinessEngine } from "@/lib/services/submission-readiness-engine";
import { evidenceGraphEngine } from "@/lib/services/evidence-graph-engine";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { TOOLS, executeTool, toGeminiTools, toOpenAiTools } from "@/lib/assistant-tools";
import { getSafeCapabilitiesContext } from "@/lib/services/capability-registry";
import { executeIntent } from "@/ai/orchestrator/execute-intent";
import { resolveHaritaMode } from "@/lib/harita/router/resolveHaritaMode";
import { haritaRuntimeService } from "@/lib/services/harita-runtime-service";
export const dynamic = "force-dynamic";

type AssistantRequest = {
  context?: AssistantContext;
  messages?: AssistantMessage[];
  tone?: "Executive" | "Guided" | "Fast";
  pickedIntent?: "analysis" | "workflow";
  attachments?: Array<{
    name: string;
    mimeType: string;
    size: number;
    base64: string;
  }>;
  idempotencyKey?: string | null;
};

type AiProvider = "doubleword" | "gemini" | "groq" | "openrouter";

type ProviderAttempt = {
  provider: AiProvider;
  model: string;
  apiKey: string;
};

function toGeminiContents(messages: AssistantMessage[], attachments: AssistantRequest["attachments"] = []) {
  const lastUserIndex = [...messages]
    .map((message, index) => ({ message, index }))
    .reverse()
    .find((entry) => entry.message.role === "user")?.index;

  return messages.map((message, index) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [
      { text: message.content },
      ...(lastUserIndex === index
        ? (attachments ?? []).slice(0, 3).map((file) => ({
            inline_data: {
              mime_type: file.mimeType || "application/octet-stream",
              data: file.base64,
            },
          }))
        : []),
    ],
  }));
}

function toGeminiMessagesWithFunctionCalls(
  messages: AssistantMessage[],
  functionCalls: Array<{ name: string; response: unknown }>,
) {
  const geminiMessages = toGeminiContents(messages);
  const modelPart = {
    role: "model" as const,
    parts: functionCalls.map((fc) => ({
      functionCall: { name: fc.name, args: {} },
    })),
  };
  const functionParts = {
    role: "function" as const,
    parts: functionCalls.map((fc) => ({
      functionResponse: { name: fc.name, response: { result: fc.response } },
    })),
  };
  return [...geminiMessages, modelPart, functionParts];
}

function toChatMessages(context: AssistantContext, messages: AssistantMessage[], workspaceSnapshot: string, role?: string) {
  return [
    {
      role: "system",
      content: buildAssistantSystemPrompt(context, workspaceSnapshot, role),
    },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

function extractText(responseData: any) {
  const candidate = responseData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(candidate)) {
    return "";
  }
  return candidate
    .map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();
}

function extractFunctionCalls(responseData: any): Array<{ name: string; args: Record<string, unknown> }> {
  const parts = responseData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return [];
  return parts
    .filter((part: any) => part?.functionCall)
    .map((part: any) => ({
      name: part.functionCall.name,
      args: part.functionCall.args ?? {},
    }));
}

function extractOpenAiFunctionCalls(responseData: any): Array<{ name: string; args: Record<string, unknown> }> {
  const toolCalls = responseData?.choices?.[0]?.message?.tool_calls;
  if (!Array.isArray(toolCalls)) return [];
  return toolCalls
    .filter((tc: any) => tc.type === "function")
    .map((tc: any) => ({
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments ?? "{}"),
    }));
}

function createTextStream(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function createResponseStream(textStream: ReadableStream<Uint8Array>, navigateTo?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Content-Type-Options": "nosniff",
  };
  if (navigateTo) {
    headers["X-Harita-Navigate"] = navigateTo;
  }
  return new Response(textStream, { headers });
}

/**
 * SECTIONS 5, 19, 22: Post-response governance filter.
 * Accumulates the full streamed AI response, applies all safety transforms,
 * then re-emits it as a clean stream. Prevents RAG metadata, technical leakage,
 * and non-authoritative workflow claims from reaching the user.
 */
function applyResponseGovernance(inputStream: ReadableStream<Uint8Array>, sessionId?: string): ReadableStream<Uint8Array> {
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

      // Apply governance filters in order
      let safe = sanitizeAiResponse(fullText);      // Section 22: strip RAG/debug labels
      safe = filterTechnicalLeakage(safe);           // Section 19: strip technical artifacts
      if (containsAuthoritativeClaim(safe)) {        // Section 5: non-authoritative enforcement
        safe = getAuthoritativeClaimRefusal();
      }
      
      // Store the final governed response in persistent history if session exists
      if (sessionId) {
        void haritaRuntimeService.storeMessage(sessionId, "assistant", safe).catch(() => {});
      }

      controller.enqueue(encoder.encode(safe));
      controller.close();
    },
  });
}


function buildProviderAttempts() {
  const configuredOrder: AiProvider[] = ["doubleword", "gemini", "groq", "openrouter"];
  const requestedProvider = env.aiProvider.toLowerCase();
  const order = configuredOrder.includes(requestedProvider as AiProvider)
    ? [requestedProvider as AiProvider, ...configuredOrder.filter((provider) => provider !== requestedProvider)]
    : configuredOrder;

  const keysByProvider: Record<AiProvider, string[]> = {
    doubleword: env.doublewordApiKeys,
    gemini: env.geminiApiKeys,
    groq: env.groqApiKeys,
    openrouter: env.openRouterApiKeys,
  };
  const modelByProvider: Record<AiProvider, string> = {
    doubleword: env.doublewordModel,
    gemini: env.geminiModel,
    groq: env.groqModel,
    openrouter: env.openRouterModel,
  };

  return order.flatMap((provider) =>
    keysByProvider[provider].map((apiKey) => ({
      provider,
      model: modelByProvider[provider],
      apiKey,
    })),
  );
}

type ProjectRow = {
  id: string;
  name: string;
  client?: string | null;
  location?: string | null;
  certification_type?: string | null;
  status?: string | null;
};

type CreditRow = {
  id: string;
  project_id: string;
  credit_code: string;
  credit_name?: string;
  documents_required?: Array<{ type: string; label: string; required: boolean }>;
  what_to_submit?: string | null;
  state: string;
};

type DocumentRow = {
  id: string;
  project_id: string;
  file_name: string;
  doc_category: string;
  state: string;
  uploaded_at: string;
};

function buildWorkspaceSnapshot(
  projects: ProjectRow[],
  credits: CreditRow[],
  documents: DocumentRow[],
  role: string,
  guidebooks: Array<{ project_id: string; title: string; file_name: string; created_at?: string }>,
) {
  if (!projects.length) {
    return "No accessible projects were found for this user.";
  }

  const creditsByProject = new Map<string, CreditRow[]>();
  const docsByProject = new Map<string, DocumentRow[]>();

  for (const credit of credits) {
    const bucket = creditsByProject.get(credit.project_id) ?? [];
    bucket.push(credit);
    creditsByProject.set(credit.project_id, bucket);
  }

  for (const document of documents) {
    const bucket = docsByProject.get(document.project_id) ?? [];
    bucket.push(document);
    docsByProject.set(document.project_id, bucket);
  }

  const lines: string[] = [];
  lines.push(`Accessible projects: ${projects.length}`);

  for (const project of projects.slice(0, 12)) {
    const projectCredits = creditsByProject.get(project.id) ?? [];
    const projectDocs = docsByProject.get(project.id) ?? [];
    const completeCredits = projectCredits.filter((credit) => credit.state === "APPROVED" || credit.state === "complete").length;
    const blockedCredits = projectCredits.filter((credit) => credit.state === "blocked").length;
    const uploadedCount = projectDocs.filter((doc) => doc.state === "READY" || doc.state === "uploaded").length;
    const ownerReviewCount = projectDocs.filter((doc) => doc.state === "SUBMITTED").length;
    const approvedCount = projectDocs.filter((doc) => doc.state === "APPROVED").length;
    const rejectedCount = projectDocs.filter((doc) => doc.state === "REJECTED" || doc.state === "CLARIFICATION").length;
    const recentFiles = projectDocs
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .slice(0, 5)
      .map((doc) =>
        role === "client" ? `${doc.doc_category}/${doc.state}` : `${doc.file_name} [${doc.doc_category}/${doc.state}]`,
      )
      .join("; ");
    const topPendingCredits = projectCredits
      .filter((credit) => credit.state !== "APPROVED" && credit.state !== "complete")
      .slice(0, 5)
      .map((credit) => `${credit.credit_code}:${credit.state}`)
      .join(", ");

    lines.push(
      `Project ${project.name} | state=${project.status ?? "unknown"} | certification=${project.certification_type ?? "n/a"} | client=${project.client ?? "n/a"} | location=${project.location ?? "n/a"}`,
    );
    lines.push(
      `Credits: total=${projectCredits.length}, complete=${completeCredits}, blocked=${blockedCredits}. Documents: uploaded=${uploadedCount}, owner_review=${ownerReviewCount}, approved=${approvedCount}, rejected=${rejectedCount}.`,
    );
    
    // Inject Certification Strategy Engine
    const strategy = certificationStrategyEngine.getStrategy(projectCredits);
    lines.push(certificationStrategyEngine.generateContextString(strategy));
    
    // Evaluate top pending credits via Submission Readiness Engine
    const topPendingEvaluated = projectCredits
      .filter((credit) => credit.state !== "APPROVED" && credit.state !== "complete")
      .slice(0, 3)
      .map(credit => submissionReadinessEngine.generateContextString(credit, projectDocs))
      .join("\n");
    if (topPendingEvaluated) {
      lines.push(topPendingEvaluated);
    }
    
    // Build evidence graph for recent files
    const recentFilesGraph = projectDocs
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .slice(0, 2)
      .map(doc => evidenceGraphEngine.generateContextString(doc, projectCredits))
      .join("\n");
    if (recentFilesGraph) {
      lines.push(recentFilesGraph);
    }
    const projectGuidebooks = guidebooks
      .filter((book) => book.project_id === project.id)
      .filter((book, index, all) => all.findIndex((entry) => entry.file_name === book.file_name) === index)
      .slice(0, 3);
    const latestGuidebook = projectGuidebooks
      .slice()
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0];
    lines.push(
      `Guidebook: ${projectGuidebooks.length ? projectGuidebooks.map((book) => `${book.title} (${book.file_name})`).join("; ") : "none uploaded"}`,
    );
    lines.push(
      `Manual version lock: ${latestGuidebook ? `${latestGuidebook.file_name}@${latestGuidebook.created_at ?? "unknown"}` : "none"}`,
    );
    const trackerPreview = projectCredits
      .slice(0, 5)
      .map((credit) => {
        const req = (credit.documents_required ?? []).filter((d) => d.required).map((d) => d.label).slice(0, 3).join(", ");
        return `${credit.credit_code}${credit.credit_name ? ` ${credit.credit_name}` : ""} -> required: ${req || "not set"}`;
      })
      .join(" | ");
    lines.push(`Tracker rows preview: ${trackerPreview || "none"}`);
    lines.push(`Recent files: ${recentFiles || "none"}`);
    lines.push(`Priority credits: ${topPendingCredits || "none"}`);
  }

  return lines.join("\n");
}

async function getWorkspaceSnapshot() {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return { user: null, role: "consultant", projectIds: [], snapshot: "User is not signed in.", userName: "", userEmail: "" };
  }

  const { data: profile } = await client
    .from("profiles")
    .select("global_role, full_name, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const userName = profile?.full_name
    ?? (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "")
    ?? "";
  const userEmail = profile?.email ?? user.email ?? "";
  const metadataRole = typeof user.user_metadata?.role === "string" ? user.user_metadata.role : "";
  const resolvedRole = (profile?.global_role ?? metadataRole ?? "consultant") as string;
  const isSuperUser =
    resolvedRole === "super_user" || metadataRole === "super_user" || metadataRole === "superuser";
  const reader = isSuperUser && env.supabaseServiceRoleKey ? createAdminClient() : client;

  const { data: projectsData } = await reader
    .from("projects")
    .select("id, name, client, location, certification_type, status")
    .order("created_at", { ascending: false })
    .limit(20);

  const projects = (projectsData ?? []) as ProjectRow[];
  const projectIds = projects.map((project) => project.id);

  if (!projectIds.length) {
    return { user, role: resolvedRole, projectIds, snapshot: "No projects currently available in the workspace.", userName, userEmail };
  }

  const [{ data: creditsData }, { data: documentsData }] = await Promise.all([
    reader
      .from("project_credits")
      .select("id, project_id, credit_code, credit_name, documents_required, what_to_submit, state")
      .in("project_id", projectIds)
      .order("credit_code"),
    reader
      .from("project_document")
      .select("id, project_id, file_name, doc_category, state, uploaded_at")
      .in("project_id", projectIds)
      .order("uploaded_at", { ascending: false })
      .limit(400),
  ]);
  const { data: guidebooksData } = await reader
    .from("project_guidebooks")
    .select("project_id, title, file_name, created_at")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  const credits = (creditsData ?? []) as CreditRow[];
  const documents = (documentsData ?? []) as DocumentRow[];
  const guidebooks = (guidebooksData ?? []) as Array<{ project_id: string; title: string; file_name: string; created_at?: string }>;

  // Fetch recent intelligence for these documents
  const { data: intelligence } = await reader
    .from("document_intelligence")
    .select("*")
    .in("document_id", documents.slice(0, 5).map(d => d.id));

  let snapshot = buildWorkspaceSnapshot(projects, credits, documents, resolvedRole, guidebooks);
  
  if (intelligence?.length) {
    snapshot += "\n\nRecent Document Intelligence:\n";
    for (const intel of intelligence) {
      const doc = documents.find(d => d.id === intel.document_id);
      snapshot += `- ${doc?.file_name}: ${intel.summary} [Relevance: ${intel.relevance_score}%] Risks: ${intel.risks?.join(", ") || "None"}\n`;
    }
  }

  return { user, role: resolvedRole, projectIds, snapshot, userName, userEmail };
}

function getProjectIdFromContext(context?: AssistantContext) {
  const current = String(context?.currentItem ?? "");
  const match = current.match(/^\/projects\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function isFileQuestion(query: string) {
  const q = query.toLowerCase();
  return (
    q.includes("what is this file") ||
    q.includes("what's this file") ||
    q.includes("analyze this file") ||
    q.includes("analyse this file") ||
    q.includes("tell me about this file") ||
    q.includes("tell me more about the file") ||
    q.includes("file uploaded") ||
    q.includes("attached file") ||
    q.includes("about this file") ||
    q.includes("check this file") ||
    q.includes("read this file") ||
    q.includes("explain this file") ||
    q.includes("compare it") ||
    q.includes("recheck")
  );
}

function isUploadMappingIntent(
  query: string,
  options?: {
    analysisOnly?: boolean;
    hasAttachments?: boolean;
  },
) {
  // HARD BLOCK:
  // If attachment was added only for analysis,
  // NEVER enter workflow execution routing.
  if (options?.analysisOnly === true) {
    return false;
  }

  const q = query.toLowerCase().trim();

  // Explicit user execution intent only.
  return (
    q.startsWith("upload this") ||
    q.startsWith("map this to") ||
    q.startsWith("submit this") ||
    q.startsWith("push this") ||
    q.includes("confirm upload") ||
    q.includes("upload this to") ||
    q.includes("map this file to")
  );
}

function detectDocTypeFromAttachment(name: string, mimeType?: string) {
  const lower = name.toLowerCase();
  const mime = String(mimeType ?? "").toLowerCase();
  if (mime.includes("pdf") || lower.endsWith(".pdf")) return "Drawing / Narrative PDF";
  if (mime.includes("spreadsheet") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "Tracker / Spreadsheet";
  if (mime.startsWith("image/")) return "Site Photo / Image Evidence";
  if (mime.includes("word") || lower.endsWith(".doc") || lower.endsWith(".docx")) return "Narrative / Report";
  return "Project document";
}

function buildAttachmentAnalysisReply(
  userName: string,
  file: { name: string; mimeType: string; size: number },
  ragMatches: Array<{ content: string; metadata?: Record<string, unknown>; score: number }>,
) {
  const kb = Math.max(1, Math.round((file.size ?? 0) / 1024));
  const docType = detectDocTypeFromAttachment(file.name, file.mimeType);
  const hints = file.name.replace(/\.[^.]+$/, "").split(/[_\-\s]+/).filter(Boolean).slice(0, 6).join(", ");

  const likelyCredits = ragMatches
    .map((item) => ({
      code: String(item.metadata?.credit_code ?? "").trim(),
      score: item.score,
      reason: item.content.slice(0, 120).replace(/\s+/g, " ").trim(),
    }))
    .filter((item) => item.code.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const creditLines =
    likelyCredits.length > 0
      ? likelyCredits.map((item, index) => {
          const confidence = item.score >= 0.75 ? "high" : item.score >= 0.6 ? "medium" : "low";
          return `${index + 1}. ${item.code} (${confidence} confidence) - ${item.reason}`;
        })
      : ["No strong credit match yet from project context. I can still map once you confirm the target credit code."];

  return [
    `Hi ${userName}, I checked your attached file.`,
    "",
    `Document type detected: ${docType}`,
    `File: ${file.name} (${kb} KB)`,
    "",
    "Key data points found:",
    `- Filename hints: ${hints || "not enough hints in filename"}`,
    `- MIME type: ${file.mimeType || "unknown"}`,
    "",
    "Likely credit matches:",
    ...creditLines,
    "",
    "You can now ask me to analyse relevance, compare against credits, or explicitly instruct me to upload/map the file.",
  ].join("\n");
}

// ─── Gemini helpers ───────────────────────────────────────────────────────────

async function callGeminiWithTools(
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



async function createGeminiStream(
  context: AssistantContext,
  messages: AssistantMessage[],
  workspaceSnapshot: string,
  attempt: ProviderAttempt,
  role?: string,
  functionResults?: Array<{ name: string; response: unknown }>,
) {
  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: buildAssistantSystemPrompt(context, workspaceSnapshot, role) }],
    },
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 500,
    },
  };

  if (functionResults?.length) {
    body.contents = toGeminiMessagesWithFunctionCalls(messages, functionResults);
  } else {
    body.contents = toGeminiContents(messages);
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${attempt.model}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": attempt.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    return null;
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      let lastText = "";

      const emitText = (currentText: string) => {
        const nextChunk = currentText.startsWith(lastText) ? currentText.slice(lastText.length) : currentText;
        if (nextChunk) {
          controller.enqueue(encoder.encode(nextChunk));
        }
        lastText = currentText;
      };

      const processEvent = (eventBlock: string) => {
        const dataLines = eventBlock
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());

        for (const line of dataLines) {
          if (!line || line === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(line) as any;
            const currentText = extractText(parsed);
            if (currentText) {
              emitText(currentText);
            }
          } catch {
            // Ignore malformed chunks and keep streaming.
          }
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          let separatorIndex = buffer.indexOf("\n\n");
          while (separatorIndex !== -1) {
            const eventBlock = buffer.slice(0, separatorIndex).trim();
            buffer = buffer.slice(separatorIndex + 2);
            if (eventBlock) {
              processEvent(eventBlock);
            }
            separatorIndex = buffer.indexOf("\n\n");
          }
        }

        const tail = buffer.trim();
        if (tail) {
          processEvent(tail);
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

async function logAiInteraction(params: {
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

function tryDeterministicAnswer(intent: string, snapshot: string) {
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

// ─── OpenAI-compatible helpers ───────────────────────────────────────────────

function openAiCompatibleEndpoint(provider: AiProvider) {
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
    "Content-Type": "application/json",
    Authorization: `Bearer ${attempt.apiKey}`,
  };
  if (attempt.provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://tracknov.app";
    headers["X-Title"] = "Tracknov";
  }
  return headers;
}

async function callOpenAiWithTools(
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

async function createOpenAiCompatibleStream(
  context: AssistantContext,
  messages: AssistantMessage[],
  workspaceSnapshot: string,
  attempt: ProviderAttempt,
  role?: string,
  functionResults?: Array<{ name: string; response: unknown }>,
) {
  let bodyMessages = toChatMessages(context, messages, workspaceSnapshot, role);

  if (functionResults?.length) {
    const lastAssistantMsg = bodyMessages[bodyMessages.length - 1];
    bodyMessages = [
      ...bodyMessages.slice(0, -1),
      {
        ...lastAssistantMsg,
        content: lastAssistantMsg.content,
        tool_calls: functionResults.map((fr) => ({
          id: `call_${fr.name}`,
          type: "function" as const,
          function: { name: fr.name, arguments: "{}" },
        })),
      } as any,
      ...functionResults.map((fr) => ({
        role: "tool" as const,
        tool_call_id: `call_${fr.name}`,
        content: JSON.stringify(fr.response),
      })),
    ];
  }

  const response = await fetch(openAiCompatibleEndpoint(attempt.provider), {
    method: "POST",
    headers: openAiHeaders(attempt),
    body: JSON.stringify({
      model: attempt.model,
      messages: bodyMessages,
      temperature: 0.4,
      max_tokens: 500,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    return null;
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";

      const processEvent = (eventBlock: string) => {
        const dataLines = eventBlock
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());

        for (const line of dataLines) {
          if (!line || line === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(line) as any;
            const text = parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content ?? "";
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          } catch {
            // Ignore malformed chunks and keep streaming.
          }
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          let separatorIndex = buffer.indexOf("\n\n");
          while (separatorIndex !== -1) {
            const eventBlock = buffer.slice(0, separatorIndex).trim();
            buffer = buffer.slice(separatorIndex + 2);
            if (eventBlock) {
              processEvent(eventBlock);
            }
            separatorIndex = buffer.indexOf("\n\n");
          }
        }

        const tail = buffer.trim();
        if (tail) {
          processEvent(tail);
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

// ─── Orchestration ────────────────────────────────────────────────────────────

async function tryDetectFunctionCalls(
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
      // Content response means no function call needed
      if (result?.type === "content") {
        return [];
      }
    } catch (error) {
      console.warn(`[Assistant] Tool detection ${attempt.provider} failed; trying next.`, error);
    }
  }
  return null;
}

async function createAiStream(
  context: AssistantContext,
  messages: AssistantMessage[],
  workspaceSnapshot: string,
  role?: string,
  functionResults?: Array<{ name: string; response: unknown }>,
) {
  const attempts = buildProviderAttempts();

  for (const attempt of attempts) {
    try {
      const stream =
        attempt.provider === "gemini"
          ? await createGeminiStream(context, messages, workspaceSnapshot, attempt, role, functionResults)
          : await createOpenAiCompatibleStream(context, messages, workspaceSnapshot, attempt, role, functionResults);

      if (stream) {
        return stream;
      }
    } catch (error) {
      console.warn(`[Assistant] ${attempt.provider} failed; trying next configured AI key/provider.`, error);
    }
  }

  return null;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

/* Duplicate region removed
export async function POST(request: Request) {
  const throttled = checkRateLimit(request, {
    key: "api:assistant:chat",
    limit: 40,
    windowMs: 60_000,
  });
  if (throttled) return throttled;

  const startedAt = Date.now();
  let body: AssistantRequest;

  try {
    body = (await request.json()) as AssistantRequest;
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  if (text) {
    return { type: "content", text };
  }

  return null;
}

async function createOpenAiCompatibleStream(
  context: AssistantContext,
  messages: AssistantMessage[],
  workspaceSnapshot: string,
  attempt: ProviderAttempt,
  role?: string,
  functionResults?: Array<{ name: string; response: unknown }>,
) {
  let bodyMessages = toChatMessages(context, messages, workspaceSnapshot, role);

  if (functionResults?.length) {
    const lastAssistantMsg = bodyMessages[bodyMessages.length - 1];
    bodyMessages = [
      ...bodyMessages.slice(0, -1),
      {
        ...lastAssistantMsg,
        content: lastAssistantMsg.content,
        tool_calls: functionResults.map((fr) => ({
          id: `call_${fr.name}`,
          type: "function" as const,
          function: { name: fr.name, arguments: "{}" },
        })),
      } as any,
      ...functionResults.map((fr) => ({
        role: "tool" as const,
        tool_call_id: `call_${fr.name}`,
        content: JSON.stringify(fr.response),
      })),
    ];
  }

  const response = await fetch(openAiCompatibleEndpoint(attempt.provider), {
    method: "POST",
    headers: openAiHeaders(attempt),
    body: JSON.stringify({
      model: attempt.model,
      messages: bodyMessages,
      temperature: 0.4,
      max_tokens: 500,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    return null;
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";

      const processEvent = (eventBlock: string) => {
        const dataLines = eventBlock
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());

        for (const line of dataLines) {
          if (!line || line === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(line) as any;
            const text = parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content ?? "";
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          } catch {
            // Ignore malformed chunks and keep streaming.
          }
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          let separatorIndex = buffer.indexOf("\n\n");
          while (separatorIndex !== -1) {
            const eventBlock = buffer.slice(0, separatorIndex).trim();
            buffer = buffer.slice(separatorIndex + 2);
            if (eventBlock) {
              processEvent(eventBlock);
            }
            separatorIndex = buffer.indexOf("\n\n");
          }
        }

        const tail = buffer.trim();
        if (tail) {
          processEvent(tail);
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

// ─── Orchestration ────────────────────────────────────────────────────────────

async function tryDetectFunctionCalls(
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
      // Content response means no function call needed
      if (result?.type === "content") {
        return [];
      }
    } catch (error) {
      console.warn(`[Assistant] Tool detection ${attempt.provider} failed; trying next.`, error);
    }
  }
  return null;
}

async function createAiStream(
  context: AssistantContext,
  messages: AssistantMessage[],
  workspaceSnapshot: string,
  role?: string,
  functionResults?: Array<{ name: string; response: unknown }>,
) {
  const attempts = buildProviderAttempts();

  for (const attempt of attempts) {
    try {
      const stream =
        attempt.provider === "gemini"
          ? await createGeminiStream(context, messages, workspaceSnapshot, attempt, role, functionResults)
          : await createOpenAiCompatibleStream(context, messages, workspaceSnapshot, attempt, role, functionResults);

      if (stream) {
        return stream;
      }
    } catch (error) {
      console.warn(`[Assistant] ${attempt.provider} failed; trying next configured AI key/provider.`, error);
    }
  }

  return null;
}
*/

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const throttled = checkRateLimit(request, {
    key: "api:assistant:chat",
    limit: 40,
    windowMs: 60_000,
  });
  if (throttled) return throttled;

  const startedAt = Date.now();
  let body: AssistantRequest;

  try {
    body = (await request.json()) as AssistantRequest;
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const context = body.context;
  const messages = body.messages ?? [];
  const attachments = (body.attachments ?? []).slice(0, 3);
  const idempotencyKey = body.idempotencyKey ?? null;

  if (!context || !context.title || !context.summary) {
    return new Response("Missing assistant context.", { status: 400 });
  }

  const latestPromptRaw = [...messages].reverse().find((message) => message.role === "user")?.content ?? "What should I do next?";
  const latestPrompt = sanitizeUserText(latestPromptRaw);
  const intent = routeHaritaIntent(latestPrompt);
  const recentContext = messages.slice(-3).map(m => m.content).join(" ");
  const intentCategory = semanticDisambiguateIntent(latestPrompt, recentContext);
  const focusedProjectId = getProjectIdFromContext(context);

  const { user, role, snapshot, projectIds, userEmail } = await getWorkspaceSnapshot();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient();

  // Enforce Section 10 (Tenant Isolation Law) and Section 27 (Security Event Model) boundaries
  if (focusedProjectId && !projectIds.includes(focusedProjectId)) {
    // Attempted cross-project AI context extraction leakage detected!
    // Persist immutable security trace natively
    const traceId = crypto.randomUUID();
    await supabase.from("security_events").insert({
      id: traceId,
      project_id: focusedProjectId,
      actor_id: user.id,
      event_type: "tenant_isolation_violation",
      severity: "critical",
      details: {
        action: "ai_harita_context_injection",
        blocked: true,
        injected_project_id: focusedProjectId,
        accessible_projects: projectIds,
        enforcement_layer: "AI Harita Route Guard",
        governance_law: "Section 10 — Tenant Isolation Law",
        security_model: "Section 27 — Security Event Model",
      },
    });
    return new Response(
      JSON.stringify({
        error: "ACCESS DENIED",
        status: 403,
        message: "Requested project context violates multi-tenant isolation boundaries. Access strictly denied.",
        security_trace_captured: true,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  // PHASE 3: EnovAIT Orchestration — strictly route workflow intents through the orchestrator
  if (intentCategory === "workflow_action" && focusedProjectId) {
    const { user: workflowUser, role: workflowRole } = await getWorkspaceSnapshot();
    if (!workflowUser) {
      return new Response("Unauthorized", { status: 401 });
    }
    const intentResult = await executeIntent({
      userId: workflowUser.id,
      role: workflowRole,
      projectContext: {
        projectId: focusedProjectId,
        projectName: context.title ?? null,
      },
      query: latestPrompt,
    });
    return createResponseStream(createTextStream(intentResult.message));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const userName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "there";

  // Resolve session and augment context with server-side memory
  const activeProjectId = focusedProjectId || projectIds[0];
  const session = await haritaRuntimeService.getOrCreateSession(user.id, activeProjectId);
  
  // Store user prompt in persistent history
  await haritaRuntimeService.storeMessage(session.id, "user", latestPrompt);

  // Build augmented context from semantic memory
  const augmentedContext = await haritaRuntimeService.buildAugmentedContext(user.id, activeProjectId, context);

  const ragMatches = await ragService.retrieveContext({
    query: latestPrompt,
    projectIds: focusedProjectId ? [focusedProjectId] : projectIds ?? [],
    limit: 6,
  });
  const ragSnapshot = ragMatches.length
    ? ragMatches
        .map((item, index) => {
          const source = String(item.metadata?.source ?? "context");
          const code = String(item.metadata?.credit_code ?? "");
          return `RAG ${index + 1} [${source}${code ? `/${code}` : ""}] score=${item.score.toFixed(3)}: ${item.content}`;
        })
        .join("\n")
    : "No RAG matches found for current query.";
  const attachmentSummary = attachments.length
    ? [
        "Uploaded attachments:",
        ...attachments.map((file, index) => {
          const kb = Math.max(1, Math.round((file.size ?? 0) / 1024));
          return `${index + 1}. ${file.name} (${file.mimeType}, ${kb} KB)`;
        }),
      ].join("\n")
    : "Uploaded attachments: none";
  const compactSnapshot = focusedProjectId
    ? [snapshot, "", "Note: focus on current project only.", focusedProjectId].join("\n")
    : snapshot;
  const combinedSnapshot = sanitizeContextText([compactSnapshot, "", "Retrieved context:", ragSnapshot, "", attachmentSummary].join("\n"));
  const hasManualLock = combinedSnapshot.includes("Manual version lock:") && !combinedSnapshot.includes("Manual version lock: none");

  // Deterministic-first routing for status/workflow/validation intents.
  const deterministic = tryDeterministicAnswer(intent, combinedSnapshot);
  if (deterministic) {
    await logAiInteraction({
      userId: user.id,
      intent,
      query: latestPrompt,
      model: "deterministic",
      contextSize: combinedSnapshot.length,
      tokenUsage: 0,
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
    });
    return createResponseStream(createTextStream(deterministic));
  }

  if ((intent === "mapping" || intent === "comparison" || intent === "summary") && !hasManualLock) {
    const manualLockReply = normalizeHaritaResponse({
      assessment: getUnknownDataResponse(),
      fit: "Not suitable",
      reason: "Project manual version is not locked for this workspace.",
      recommendation: "Ask Project Admin/Super User to upload and lock the guidebook first.",
      confirm: "Confirm?",
    });
    await logAiInteraction({
      userId: user.id,
      intent,
      query: latestPrompt,
      model: "deterministic",
      contextSize: combinedSnapshot.length,
      tokenUsage: 0,
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
    });
    return createResponseStream(createTextStream(manualLockReply));
  }

  // Determine tone
  let resolvedTone: AssistantTone;
  if (body.tone) {
    resolvedTone = body.tone === "Guided" ? "Operator" : (body.tone === "Fast" ? "Power" : "Executive");
  } else {
    resolvedTone = await toneService.getUserTone(user.id, role);
  }

  if (isFileQuestion(latestPrompt) && attachments.length === 0) {
    const message = "No file is attached in this chat message. Please attach the file with the + button first.";
    await logAiInteraction({
      userId: user.id,
      intent,
      query: latestPrompt,
      model: "deterministic",
      contextSize: combinedSnapshot.length,
      tokenUsage: 0,
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
    });
    return createResponseStream(createTextStream(message));
  }

  const isAnalysisAttachmentFlow =
    Boolean(attachments?.length) &&
    !isUploadMappingIntent(latestPrompt ?? "", {
      analysisOnly: body.pickedIntent === "analysis",
      hasAttachments: true,
    });

  if (!isAnalysisAttachmentFlow && requiresExplicitConfirmationForExecution(latestPrompt)) {
    const confirmReply = "I can prepare this upload flow, but execution needs explicit confirmation. Please reply: 'Confirm upload this to <credit code> as <document type>' to proceed.";
    await logAiInteraction({
      userId: user.id,
      intent,
      query: latestPrompt,
      model: "deterministic",
      contextSize: combinedSnapshot.length,
      tokenUsage: 0,
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
    });
    return createResponseStream(createTextStream(confirmReply));
  }

  const AI_ENABLED = process.env.AI_ENABLED !== "false";
  if (!env.aiReady || !AI_ENABLED) {
    // Fall back to attachment analysis or generic reply if possible
    if (attachments.length > 0) {
      const file = attachments[0];
      const isAnalysisRequest = !isUploadMappingIntent(latestPrompt, { analysisOnly: body.pickedIntent === "analysis" }) || isFileQuestion(latestPrompt);
      const attachmentReply = isAnalysisRequest
        ? buildAttachmentAnalysisReply(userName, file, ragMatches)
        : [
            `Hi ${userName}, I can see your attached file: ${file.name}.`,
            "Tell me the credit code and document type you want, and I will prepare the workflow upload step.",
          ].join("\n");
      await logAiInteraction({
        userId: user.id,
        intent,
        query: latestPrompt,
        model: "fallback",
        contextSize: combinedSnapshot.length,
        tokenUsage: 0,
        fallbackUsed: true,
        latencyMs: Date.now() - startedAt,
      });
      return createResponseStream(createTextStream(attachmentReply));
    }
  }

  const toneInstructions = toneService.getToneInstructions(resolvedTone);

  // PHASE 4: Role-Aware Context Builder — inject safe capability context
  const capabilitiesContext = [
      getSafeCapabilitiesContext((augmentedContext.surface as any) ?? "dashboard", role as any),
      knowledgeEngine.getPlatformRoadmapContext(),
      knowledgeEngine.getConstructionStageGateRules(),
    ].join("\n\n");

  const enrichedContext: AssistantContext = {
    ...augmentedContext,
    capabilities: capabilitiesContext,
    facts: [
      ...augmentedContext.facts,
      `User: ${userName || userEmail || "Unknown"}`,
      `User email: ${userEmail}`,
      `Resolved role: ${role}`,
      `Current Tone: ${resolvedTone}`,
      "Responses must be grounded in the workspace snapshot attached in system instructions.",
    ],
  };
  const mergedContext = { ...enrichedContext, summary: context.summary + "\n\n" + toneInstructions };

  if (attachments.length > 0) {
    const lastUserIndex = [...messages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find((entry) => entry.message.role === "user")?.index;
    if (typeof lastUserIndex === "number") {
      const attachmentNote =
        "\n\nAttached files for this question:\n" +
        attachments
          .map((file, index) => `- ${index + 1}. ${file.name} (${file.mimeType})`)
          .join("\n") +
        "\nUse these attachments with workspace context before answering.";
      messages[lastUserIndex] = {
        ...messages[lastUserIndex],
        content: `${messages[lastUserIndex].content}${attachmentNote}`,
      };
    }
  }

  try {
    // SECTION 14: Tool Arbitration Pre-flight — only call tools for workflow/operational intents
    const toolsNeeded = requiresToolCall(intentCategory);
    const functionCalls = toolsNeeded
      ? await tryDetectFunctionCalls(mergedContext, messages, combinedSnapshot, role)
      : null;

    if (functionCalls && functionCalls.length > 0) {
      // Phase 2: Execute all function calls
      const results: Array<{ name: string; response: unknown }> = [];
      let navigateTo: string | undefined;

      for (const fc of functionCalls) {
        // SECTION 3: Inject idempotency key for workflow mutations
        if (idempotencyKey && (fc.name === "reviewDocument" || fc.name.includes("Transition"))) {
           fc.args.idempotencyKey = fc.args.idempotencyKey || idempotencyKey;
        }
        const result = await executeTool(fc.name, fc.args);
        results.push({ name: fc.name, response: result });
        if (result.navigateTo) {
          navigateTo = result.navigateTo;
        }
      }

      // Phase 3: Stream the final response with function results
      const aiStream = await createAiStream(mergedContext, messages, combinedSnapshot, role, results);
      if (aiStream) {
        await logAiInteraction({
          userId: user.id,
          intent,
          query: latestPrompt,
          model: "multi-provider-tools",
          contextSize: combinedSnapshot.length,
          tokenUsage: Math.ceil((latestPrompt.length + combinedSnapshot.length) / 4),
          fallbackUsed: false,
          latencyMs: Date.now() - startedAt,
        });
        return createResponseStream(aiStream, navigateTo);
      }
    } else {
      // No function calls needed, stream directly
      const aiStream = await createAiStream(mergedContext, messages, combinedSnapshot, role);
      if (aiStream) {
        await logAiInteraction({
          userId: user.id,
          intent,
          query: latestPrompt,
          model: "multi-provider-stream",
          contextSize: combinedSnapshot.length,
          tokenUsage: Math.ceil((latestPrompt.length + combinedSnapshot.length) / 4),
          fallbackUsed: false,
          latencyMs: Date.now() - startedAt,
        });
        // SECTION 5, 19, 22: Apply post-response safety filters before streaming
        const finalStream = applyResponseGovernance(aiStream, session.id);
        return createResponseStream(finalStream);
      }
    }
  } catch (error) {
    console.error("[Assistant] AI pipeline failed:", error);
    
    // Fallback: If AI fails but we have an attachment, provide a quick structural analysis
    if (attachments.length && isFileQuestion(latestPrompt)) {
      const analysis = buildAttachmentAnalysisReply(userName, attachments[0], ragMatches);
      await haritaRuntimeService.storeSemanticMemory(session.id, "analysis", attachments[0].name, {
        summary: analysis,
        timestamp: new Date().toISOString()
      });
      await haritaRuntimeService.storeMessage(session.id, "assistant", analysis);
      
      await logAiInteraction({
        userId: user.id,
        intent,
        query: latestPrompt,
        model: "fallback-analysis",
        contextSize: combinedSnapshot.length,
        tokenUsage: 0,
        fallbackUsed: true,
        latencyMs: Date.now() - startedAt,
      });
      return createResponseStream(createTextStream(analysis));
    }
  }

  const fallbackText = buildFallbackAssistantReply(context, latestPrompt);
  await haritaRuntimeService.storeMessage(session.id, "assistant", fallbackText);
  
  await logAiInteraction({
    userId: user.id,
    intent,
    query: latestPrompt,
    model: "fallback",
    contextSize: combinedSnapshot.length,
    tokenUsage: 0,
    fallbackUsed: true,
    latencyMs: Date.now() - startedAt,
  });
  return createResponseStream(createTextStream(fallbackText));
}


