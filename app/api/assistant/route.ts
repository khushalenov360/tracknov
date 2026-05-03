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

function toGeminiContents(messages: AssistantMessage[]) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
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
  guidebooks: Array<{ project_id: string; title: string; file_name: string }>,
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
    const projectGuidebooks = guidebooks.filter((book) => book.project_id === project.id);
    lines.push(
      `Guidebook: ${projectGuidebooks.length ? projectGuidebooks.map((book) => `${book.title} (${book.file_name})`).join("; ") : "none uploaded"}`,
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
    .select("project_id, title, file_name")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  const credits = (creditsData ?? []) as CreditRow[];
  const documents = (documentsData ?? []) as DocumentRow[];
  const guidebooks = (guidebooksData ?? []) as Array<{ project_id: string; title: string; file_name: string }>;

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

async function handleToolCall(name: string, args: any, user: any) {
  const supabase = createClient();
  
  switch (name) {
    case "get_wallet_balance": {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("document_credits, consultant_credits")
        .eq("user_id", user.id)
        .maybeSingle();
      return wallet || { document_credits: 0, consultant_credits: 0 };
    }
    case "get_project_status": {
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("id", args.projectId)
        .maybeSingle();
      return project || { error: "Project not found" };
    }
    case "get_document_reviews": {
      const { data: reviews } = await supabase
        .from("document_reviews")
        .select("*")
        .eq("document_id", args.documentId)
        .order("created_at", { ascending: false });
      return reviews || [];
    }
    case "get_credit_guidance": {
      const { data: guidance } = await supabase
        .from("project_credits")
        .select("credit_code, what_to_submit, sample_document_url")
        .eq("credit_code", args.creditCode)
        .limit(1)
        .maybeSingle();
      return guidance || { error: "Guidance not found" };
    }
    default:
      return { error: "Unknown tool" };
  }
}

function classifyIntent(query: string) {
  const q = query.toLowerCase();
  if (q.includes("token") || q.includes("credit cost") || q.includes("session cost") || q.includes("wallet") || q.includes("balance")) {
    return "billing";
  }
  if (q.includes("next step") || q.includes("what should i do") || q.includes("priority") || q.includes("todo") || q.includes("task")) {
    return "workflow";
  }
  if (q.includes("upload") || q.includes("document") || q.includes("file") || q.includes("rejection") || q.includes("review")) {
    return "document_analysis";
  }
  if (q.includes("credit") || q.includes("igbc") || q.includes("what to submit") || q.includes("guidance")) {
    return "credit_guidance";
  }
  return "general";
}

const SYSTEM_RULES = {
  token_per_upload: 1,
  consulting_tokens: 50,
};

function formatDirectResponse(name: string, answer: string, data: string[], recommendation: string) {
  return `Hi ${name} 👋\n\nAnswer:\n${answer}\n\nData:\n${data.map(d => `- ${d}`).join("\n")}\n\nRecommendation:\n${recommendation}`;
}

const assistantTools = [
  {
    function_declarations: [
      {
        name: "get_wallet_balance",
        description: "Fetch the user's current token credits (document and consultant credits).",
      },
      {
        name: "get_project_status",
        description: "Fetch detailed status and metrics for a specific project.",
        parameters: {
          type: "object",
          properties: {
            projectId: { type: "string", description: "The UUID of the project." },
          },
          required: ["projectId"],
        },
      },
      {
        name: "get_document_reviews",
        description: "Fetch the review history and rejection reasons for a specific document.",
        parameters: {
          type: "object",
          properties: {
            documentId: { type: "string", description: "The UUID of the document." },
          },
          required: ["documentId"],
        },
      },
      {
        name: "get_credit_guidance",
        description: "Fetch 'What to Submit' guidance and sample document info for a specific credit code.",
        parameters: {
          type: "object",
          properties: {
            creditCode: { type: "string", description: "The code of the credit (e.g., 'SSp1')." },
          },
          required: ["creditCode"],
        },
      },
    ],
  },
];

async function createGeminiStream(context: AssistantContext, messages: AssistantMessage[], workspaceSnapshot: string, user: any) {
  const contents: any[] = toGeminiContents(messages);
  const systemInstruction = {
    parts: [{ text: buildAssistantSystemPrompt(context, workspaceSnapshot) }],
  };

  // First pass: Check for tool calls
  const initialResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.aiModel}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.geminiApiKey,
    },
    body: JSON.stringify({
      systemInstruction,
      contents,
      tools: assistantTools,
      generationConfig: {
        temperature: 0.2, // Lower temp for tool calling
        maxOutputTokens: 1000,
      },
    }),
  });

  if (!initialResponse.ok) return null;
  const initialData = await initialResponse.json();
  const firstCandidate = initialData.candidates?.[0];
  const toolCalls = firstCandidate?.content?.parts?.filter((p: any) => p.functionCall);

  if (toolCalls && toolCalls.length > 0) {
    const toolResults = [];
    for (const call of toolCalls) {
      const result = await handleToolCall(call.functionCall.name, call.functionCall.args, user);
      toolResults.push({
        functionResponse: {
          name: call.functionCall.name,
          response: { name: call.functionCall.name, content: result },
        },
      });
    }

    // Add model's call and our results to history
    contents.push(firstCandidate.content);
    contents.push({ role: "function", parts: toolResults });
  }

  // Final pass: Stream the result
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.aiModel}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.geminiApiKey,
    },
    body: JSON.stringify({
      systemInstruction,
      contents,
      tools: assistantTools,
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 800,
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

export async function POST(request: Request) {
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

  const latestPrompt = [...messages].reverse().find((message) => message.role === "user")?.content ?? "What should I do next?";
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
    projectIds: projectIds ?? [],
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
  const combinedSnapshot = [snapshot, "", "Retrieved context:", ragSnapshot, "", attachmentSummary].join("\n");

  // Determine tone
  let resolvedTone: AssistantTone;
  if (body.tone) {
    resolvedTone = body.tone === "Guided" ? "Operator" : (body.tone === "Fast" ? "Power" : "Executive");
  } else {
    resolvedTone = await toneService.getUserTone(user.id, role);
  }

  // --- START V2 ROUTER LOGIC ---
  const intent = classifyIntent(latestPrompt);

  if (intent === "billing") {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("document_credits, consultant_credits")
      .eq("user_id", user.id)
      .maybeSingle();
    
    const docCredits = wallet?.document_credits ?? 0;
    const consCredits = wallet?.consultant_credits ?? 0;

    return createResponseStream(createTextStream(formatDirectResponse(
      userName,
      `1 document upload consumes ${SYSTEM_RULES.token_per_upload} credit. 1 consulting session consumes ${SYSTEM_RULES.consulting_tokens} credits.`,
      [`Document credits: ${docCredits}`, `Consultant credits: ${consCredits}`],
      docCredits > 0 ? "You can safely upload your documents." : "Please top up your wallet to continue."
    )));
  }

  if (intent === "workflow") {
    const leadStep = context.nextSteps[0] || "No immediate steps found.";
    return createResponseStream(createTextStream(formatDirectResponse(
      userName,
      `Your current priority is: ${leadStep}`,
      [`Accessible projects: ${projectIds?.length ?? 0}`, ...context.nextSteps.slice(0, 3)],
      "Complete the lead step to unlock the next workflow stage."
    )));
  }
  // --- END V2 ROUTER LOGIC ---

  if (!env.geminiApiKey) {
    return createResponseStream(
      createTextStream(
        [
          buildFallbackAssistantReply(context, latestPrompt),
          "",
          "Workspace snapshot:",
          combinedSnapshot,
        ].join("\n"),
      ),
    );
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
      user,
    );
    if (geminiStream) {
      return createResponseStream(geminiStream);
    }
  } catch {
    // Fall through to the local fallback.
  }

  return createResponseStream(
    createTextStream(
      [
        buildFallbackAssistantReply(context, latestPrompt),
        "",
        "Workspace snapshot:",
        combinedSnapshot,
      ].join("\n"),
    ),
  );
}
