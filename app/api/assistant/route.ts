import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildAssistantSystemPrompt,
  buildFallbackAssistantReply,
  type AssistantContext,
  type AssistantMessage,
} from "@/lib/assistant";

export const dynamic = "force-dynamic";

type AssistantRequest = {
  context?: AssistantContext;
  messages?: AssistantMessage[];
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
    return { user, role: resolvedRole, snapshot: "No projects currently available in the workspace." };
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
  return { user, role: resolvedRole, snapshot: buildWorkspaceSnapshot(projects, credits, documents, resolvedRole) };
}

async function createGeminiStream(context: AssistantContext, messages: AssistantMessage[], workspaceSnapshot: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.aiModel}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.geminiApiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildAssistantSystemPrompt(context, workspaceSnapshot) }],
      },
      contents: toGeminiContents(messages),
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 500,
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

  if (!context || !context.title || !context.summary) {
    return new Response("Missing assistant context.", { status: 400 });
  }

  const latestPrompt = [...messages].reverse().find((message) => message.role === "user")?.content ?? "What should I do next?";
  const { user, role, snapshot } = await getWorkspaceSnapshot();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!env.geminiApiKey) {
    return createResponseStream(
      createTextStream(
        [
          buildFallbackAssistantReply(context, latestPrompt),
          "",
          "Workspace snapshot:",
          snapshot,
        ].join("\n"),
      ),
    );
  }

  try {
    const enrichedContext: AssistantContext = {
      ...context,
      facts: [
        ...context.facts,
        `Resolved role: ${role}`,
        "Responses must be grounded in the workspace snapshot attached in system instructions.",
      ],
    };
    const geminiStream = await createGeminiStream(
      {
        ...enrichedContext,
        summary: context.summary,
      },
      messages,
      snapshot,
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
        snapshot,
      ].join("\n"),
    ),
  );
}
