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
import { TOOLS, executeTool, toGeminiTools, toOpenAiTools } from "@/lib/assistant-tools";

export const dynamic = "force-dynamic";

type AssistantRequest = {
  context?: AssistantContext;
  messages?: AssistantMessage[];
};

type AiProvider = "doubleword" | "gemini" | "groq" | "openrouter";

type ProviderAttempt = {
  provider: AiProvider;
  model: string;
  apiKey: string;
};

function toGeminiContents(messages: AssistantMessage[]) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
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
    headers["X-Copilot-Navigate"] = navigateTo;
  }
  return new Response(textStream, { headers });
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
  status: string;
};

type DocumentRow = {
  id: string;
  project_id: string;
  file_name: string;
  doc_category: string;
  status: string;
  uploaded_at: string;
};

function buildWorkspaceSnapshot(projects: ProjectRow[], credits: CreditRow[], documents: DocumentRow[], role: string) {
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
    const completeCredits = projectCredits.filter((credit) => credit.status === "complete").length;
    const blockedCredits = projectCredits.filter((credit) => credit.status === "blocked").length;
    const uploadedCount = projectDocs.filter((doc) => doc.status === "uploaded").length;
    const ownerReviewCount = projectDocs.filter((doc) => doc.status === "owner_approved").length;
    const approvedCount = projectDocs.filter((doc) => doc.status === "approved").length;
    const rejectedCount = projectDocs.filter((doc) => doc.status === "rejected").length;
    const recentFiles = projectDocs
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .slice(0, 5)
      .map((doc) =>
        role === "client" ? `${doc.doc_category}/${doc.status}` : `${doc.file_name} [${doc.doc_category}/${doc.status}]`,
      )
      .join("; ");
    const topPendingCredits = projectCredits
      .filter((credit) => credit.status !== "complete")
      .slice(0, 5)
      .map((credit) => `${credit.credit_code}:${credit.status}`)
      .join(", ");

    lines.push(
      `Project ${project.name} | status=${project.status ?? "unknown"} | certification=${project.certification_type ?? "n/a"} | client=${project.client ?? "n/a"} | location=${project.location ?? "n/a"}`,
    );
    lines.push(
      `Credits: total=${projectCredits.length}, complete=${completeCredits}, blocked=${blockedCredits}. Documents: uploaded=${uploadedCount}, owner_review=${ownerReviewCount}, approved=${approvedCount}, rejected=${rejectedCount}.`,
    );
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
      .from("credits")
      .select("id, project_id, credit_code, status")
      .in("project_id", projectIds)
      .order("credit_code"),
    reader
      .from("documents")
      .select("id, project_id, file_name, doc_category, status, uploaded_at")
      .in("project_id", projectIds)
      .order("uploaded_at", { ascending: false })
      .limit(400),
  ]);

  const credits = (creditsData ?? []) as CreditRow[];
  const documents = (documentsData ?? []) as DocumentRow[];
  return { user, role: resolvedRole, projectIds, snapshot: buildWorkspaceSnapshot(projects, credits, documents, resolvedRole), userName, userEmail };
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
        temperature: 0.4,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 300,
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

export async function POST(request: Request) {
  let body: AssistantRequest;

  try {
    body = (await request.json()) as AssistantRequest;
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const context = body.context;
  const messages = body.messages ?? [];

  if (!context || !context.title || !context.summary) {
    return new Response("Missing assistant context.", { status: 400 });
  }

  const latestPrompt = [...messages].reverse().find((message) => message.role === "user")?.content ?? "What should I do next?";
  const { user, role, snapshot, projectIds, userName, userEmail } = await getWorkspaceSnapshot();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

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
  const combinedSnapshot = [snapshot, "", "Retrieved context:", ragSnapshot].join("\n");

  if (!env.aiReady) {
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

  const enrichedContext: AssistantContext = {
    ...context,
    facts: [
      ...context.facts,
      `User: ${userName || userEmail || "Unknown"}`,
      `User email: ${userEmail}`,
      `Resolved role: ${role}`,
      "Responses must be grounded in the workspace snapshot attached in system instructions.",
    ],
  };
  const mergedContext = { ...enrichedContext, summary: context.summary };

  try {
    // Phase 1: Detect function calls
    const functionCalls = await tryDetectFunctionCalls(mergedContext, messages, combinedSnapshot, role);

    if (functionCalls === null) {
      // Tool detection failed entirely, fall through to streaming or fallback
    }

    if (functionCalls && functionCalls.length > 0) {
      // Phase 2: Execute all function calls
      const results: Array<{ name: string; response: unknown }> = [];
      let navigateTo: string | undefined;

      for (const fc of functionCalls) {
        const result = await executeTool(fc.name, fc.args);
        results.push({ name: fc.name, response: result });
        if (result.navigateTo) {
          navigateTo = result.navigateTo;
        }
      }

      // Phase 3: Stream the final response with function results
      const aiStream = await createAiStream(mergedContext, messages, combinedSnapshot, role, results);
      if (aiStream) {
        return createResponseStream(aiStream, navigateTo);
      }
    } else {
      // No function calls needed, stream directly
      const aiStream = await createAiStream(mergedContext, messages, combinedSnapshot, role);
      if (aiStream) {
        return createResponseStream(aiStream);
      }
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
