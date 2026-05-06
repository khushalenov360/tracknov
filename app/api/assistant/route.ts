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
import {
  getUnknownDataResponse,
  normalizeCopilotResponse,
  requiresExplicitConfirmationForExecution,
  routeCopilotIntent,
  sanitizeContextText,
  sanitizeUserText,
} from "@/lib/services/copilot-governance";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

type AssistantRequest = {
  context?: AssistantContext;
  messages?: AssistantMessage[];
  tone?: "Executive" | "Guided" | "Fast";
  attachments?: Array<{
    name: string;
    mimeType: string;
    size: number;
    base64: string;
  }>;
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

function createTextStream(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function createResponseStream(textStream: ReadableStream<Uint8Array>) {
  return new Response(textStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
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
    return { user: null, snapshot: "User is not signed in." };
  }

  const { data: profile } = await client
    .from("profiles")
    .select("global_role")
    .eq("user_id", user.id)
    .maybeSingle();

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
    return { user, role: resolvedRole, projectIds, snapshot: "No projects currently available in the workspace." };
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

  return { user, role: resolvedRole, projectIds, snapshot };
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

function isUploadMappingIntent(query: string) {
  const q = query.toLowerCase();
  return (
    q.includes("map this to") ||
    q.includes("map to ") ||
    q.includes("upload") ||
    q.includes("submit this file") ||
    q.includes("push it to workflow")
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
    "What would you like to do next: map and upload this now, or ask me to compare it against one specific credit?",
  ].join("\n");
}

async function createGeminiStream(
  context: AssistantContext,
  messages: AssistantMessage[],
  workspaceSnapshot: string,
  attachments: AssistantRequest["attachments"] = [],
) {
  const contents: any[] = toGeminiContents(messages, attachments);
  const systemInstruction = {
    parts: [{ text: buildAssistantSystemPrompt(context, workspaceSnapshot) }],
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.aiModel}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.geminiApiKey,
    },
    body: JSON.stringify({
      systemInstruction,
      contents,
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1200,
      },
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
      return normalizeCopilotResponse({
        assessment: getUnknownDataResponse(),
        fit: "Not suitable",
        reason: "No project lines found in your accessible data.",
        recommendation: "Open a project workspace and try again.",
        confirm: "Confirm?",
      });
    }
    return normalizeCopilotResponse({
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
    return normalizeCopilotResponse({
      assessment: workflowHints || getUnknownDataResponse(),
      fit: workflowHints ? "Medium" : "Not suitable",
      reason: workflowHints || "Workflow counters are not present in the current snapshot.",
      recommendation: "Ask: 'show workflow status for <project>' for a focused breakdown.",
      confirm: "Confirm?",
    });
  }
  if (intent === "validation") {
    const hasValidation = snapshot.toLowerCase().includes("required:");
    return normalizeCopilotResponse({
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

  if (!context || !context.title || !context.summary) {
    return new Response("Missing assistant context.", { status: 400 });
  }

  const latestPromptRaw = [...messages].reverse().find((message) => message.role === "user")?.content ?? "What should I do next?";
  const latestPrompt = sanitizeUserText(latestPromptRaw);
  const intent = routeCopilotIntent(latestPrompt);
  const focusedProjectId = getProjectIdFromContext(context);
  const { user, role, snapshot, projectIds } = await getWorkspaceSnapshot();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch user name for personalized prompt context
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const userName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "there";

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
    const manualLockReply = normalizeCopilotResponse({
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
    const normalizedNoAttachment = normalizeCopilotResponse({
      assessment: "No file is attached in this chat message.",
      fit: "Not suitable",
      reason: "File analysis needs an attached file in the current message.",
      recommendation: "Attach the file with the + button and ask: Analyze this file.",
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
    return createResponseStream(
      createTextStream(normalizedNoAttachment),
    );
  }

  if (requiresExplicitConfirmationForExecution(latestPrompt)) {
    const confirmReply = normalizeCopilotResponse({
      assessment: "I can prepare this upload flow, but execution needs explicit confirmation.",
      fit: "Medium",
      reason: "Compliance mode requires confirmation before upload/mapping actions.",
      recommendation: "Please reply: Confirm upload this to <credit code> as <document type>.",
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
    return createResponseStream(createTextStream(confirmReply));
  }

  if (!env.geminiApiKey) {
    if (attachments.length > 0) {
      const file = attachments[0];
      const attachmentReply = !isUploadMappingIntent(latestPrompt) || isFileQuestion(latestPrompt)
        ? buildAttachmentAnalysisReply(userName, file, ragMatches)
        : [
            `Hi ${userName}, I can see your attached file: ${file.name}.`,
            "Tell me the credit code and document type you want, and I will prepare the workflow upload step.",
          ].join("\n");
      const normalizedAttachment = normalizeCopilotResponse({
        assessment: attachmentReply,
        fit: "Medium",
        reason: "AI provider is offline, using deterministic attachment analysis fallback.",
        recommendation: "Share target credit code + document type to continue.",
        confirm: "Confirm?",
      });
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
      return createResponseStream(createTextStream(normalizedAttachment));
    }
    const fallbackText = normalizeCopilotResponse({
      assessment: buildFallbackAssistantReply(context, latestPrompt),
      fit: "Medium",
      reason: "AI provider is offline. Deterministic guidance is active.",
      recommendation: "Ask one focused question with project/credit code for precise guidance.",
      confirm: "Confirm?",
    });
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

  try {
    const toneInstructions = toneService.getToneInstructions(resolvedTone);

    const enrichedContext: AssistantContext = {
      ...context,
      facts: [
        ...context.facts,
        `Resolved role: ${role}`,
        `User Name: ${userName}`,
        `Current Tone: ${resolvedTone}`,
        "Responses must be grounded in the workspace snapshot attached in system instructions.",
      ],
    };
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

    const geminiStream = await createGeminiStream(
      {
        ...enrichedContext,
        summary: context.summary + "\n\n" + toneInstructions,
      },
      messages,
      combinedSnapshot,
      attachments,
    );
    if (geminiStream) {
      // Wrap stream with a post-log path by returning directly and logging best-effort now.
      await logAiInteraction({
        userId: user.id,
        intent,
        query: latestPrompt,
        model: env.aiModel,
        contextSize: combinedSnapshot.length,
        tokenUsage: Math.ceil((latestPrompt.length + combinedSnapshot.length) / 4),
        fallbackUsed: false,
        latencyMs: Date.now() - startedAt,
      });
      return createResponseStream(geminiStream);
    }
  } catch {
    // Fall through to the local fallback.
  }

  if (attachments.length > 0 && (isFileQuestion(latestPrompt) || !isUploadMappingIntent(latestPrompt))) {
    const fallbackAttachment = normalizeCopilotResponse({
      assessment: buildAttachmentAnalysisReply(userName, attachments[0], ragMatches),
      fit: "Medium",
      reason: "AI runtime fallback used for this file-analysis request.",
      recommendation: "Confirm mapping target to continue with upload flow.",
      confirm: "Confirm?",
    });
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
    return createResponseStream(
      createTextStream(fallbackAttachment),
    );
  }

  const normalizedFallback = normalizeCopilotResponse({
    assessment: buildFallbackAssistantReply(context, latestPrompt),
    fit: "Medium",
    reason: "AI fallback was used for this request path.",
    recommendation: "Ask with a specific project + credit code for precise enforcement-safe guidance.",
    confirm: "Confirm?",
  });
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
  return createResponseStream(createTextStream(normalizedFallback));
}


