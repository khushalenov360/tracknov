import { FunctionCallingConfigMode, GoogleGenAI, type FunctionCall } from "@google/genai";
import { buildProjectGrounding } from "./supabaseService";
import { buildLocalGuidebookContext, getGuidebookStatus } from "./guidebookService";
import { executeHaritaToolCalls, haritaToolDeclarations } from "../tools/toolRegistry";
import type { HaritaIntentSignal } from "../skills/intentRouter";
import type { SequenceDirective } from "../skills/sequenceEngine";

export type HaritaContext = {
  projectId?: string;
  title?: string;
  summary?: string;
  currentItem?: string;
};

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type AgentChatRequest = {
  message?: string;
  context?: HaritaContext;
  history?: ChatHistoryItem[];
  attachment?: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    parsedText: string;
    summary: string;
    evidenceType: string;
    hasComplianceSignals: boolean;
    extractedAt: string;
  } | null;
  attachmentTargetId?: string | null;
};

export type WritePermission = {
  taskCreationConfirmed: boolean;
};

type ProviderStatus = {
  cloud: boolean;
  local: boolean;
  active: "cloud" | "local" | "offline";
};

type StreamRequest = {
  message: string;
  context?: HaritaContext;
  groundedProjectState?: string;
  localGuidebookContext?: string;
  history?: ChatHistoryItem[];
  intentSignal?: HaritaIntentSignal;
  sequenceDirective?: SequenceDirective;
  writePermission?: WritePermission;
  signal?: AbortSignal;
  onToken: (content: string) => void;
  onStatus: (status: ProviderStatus) => void;
};

const vertexClient = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION,
});

const vertexModel = process.env.VERTEX_MODEL || "gemini-2.5-flash";
const ollamaUrl = (process.env.OLLAMA_URL || "http://192.168.29.48:11434").replace(/\/$/, "");
const ollamaModel = process.env.OLLAMA_MODEL || "qwen-vision-expert:latest";

function xmlBlock(tag: string, value: string) {
  return `<${tag}>\n${value.trim()}\n</${tag}>`;
}

type ModelContent = {
  role: "user" | "model";
  parts: Array<Record<string, unknown>>;
};

function buildSystemPrompt(
  context?: HaritaContext,
  groundedProjectState?: string,
  localGuidebookContext?: string,
  intentSignal?: HaritaIntentSignal,
  sequenceDirective?: SequenceDirective,
) {
  const guidebookStatus = getGuidebookStatus();

  return [
    xmlBlock(
      "system_persona_boundaries",
      [
        "You are Harita, Tracknov's certification intelligence copilot.",
        "Ban filler, pleasantries, and decorative openings.",
        "Every answer must be direct, operational, and grounded in available project context.",
        "Never invent project evidence, assignments, metrics, or compliance points.",
        "If evidence is missing, say exactly what is missing and what the next best action is.",
        "For compliance questions, lead with the core conclusion first.",
        "Do not say data is unavailable if the grounded project context already contains the answer.",
      ].join("\n"),
    ),
    xmlBlock(
      "authoritative_igbc_guidebook_rules",
      [
        "Use audit-first language.",
        "Separate verified evidence from inference.",
        "For guidebook lookups, cite headings, clause text, and formula references only.",
        "Never cite page numbers because the current guidebook asset is markdown without reliable page markers.",
        "When the question is broad, summarize likely blockers and the next document or data request.",
        "Keep formatting crisp and easy to scan.",
        "Prefer short sections with labels such as STATUS, VERIFIED, GAPS, NEXT ACTION.",
        "When listing credits, include code, name, status, completion, points, and missing evidence if known.",
        "When asked about blockers or priorities, rank by lowest completion, missing required evidence, repeated remarks, and unassigned required documents.",
      ].join("\n"),
    ),
    xmlBlock(
      "response_format_contract",
      [
        "Default answer shape:",
        "STATUS: <one line conclusion>",
        "VERIFIED:",
        "- <fact>",
        "- <fact>",
        "GAPS:",
        "- <gap>",
        "- <gap>",
        "NEXT ACTION:",
        "- <action>",
        "- <action>",
        "If the user explicitly asks for a count, total, owner, assignment, blocker, or credit list, answer that first before anything else.",
      ].join("\n"),
    ),
    xmlBlock(
      "intent_router_signal",
      JSON.stringify(
        {
          intent: intentSignal?.intent || "general",
          confidence: intentSignal?.confidence || "low",
          reasons: intentSignal?.reasons || [],
          preferred_tools: intentSignal?.preferredTools || [],
        },
        null,
        2,
      ),
    ),
    xmlBlock(
      "sequence_engine_directive",
      JSON.stringify(
        {
          title: sequenceDirective?.title || "Default Flow",
          should_inject: sequenceDirective?.shouldInject || false,
          enforced_tool_names: sequenceDirective?.enforcedToolNames || [],
          guidance: sequenceDirective?.guidance || [],
        },
        null,
        2,
      ),
    ),
    xmlBlock(
      "guidebook_retrieval_contract",
      localGuidebookContext
        ? "Local fallback mode: use only the retrieved guidebook excerpt block supplied below. Do not claim broader guidebook coverage than what is present."
        : guidebookStatus.available
          ? "Cloud mode: use lookup_guidebook_clause for standards, clause, definition, and formula questions before answering."
          : "Guidebook retrieval asset is currently unavailable. Do not fabricate headings, clauses, or formula references.",
    ),
    xmlBlock(
      "guidebook_retrieval_context",
      localGuidebookContext || "No guidebook excerpt block was injected into this request.",
    ),
    xmlBlock(
      "project_database_current_state",
      groundedProjectState || "Live project state must be fetched through runtime tools such as get_project_snapshot and check_document_pipeline.",
    ),
    xmlBlock(
      "runtime_tool_contract",
      groundedProjectState
        ? "Fallback mode: use the supplied grounded state because live tool execution is unavailable."
        : "Cloud mode: fetch live Tracknov data through tools before making claims about points, blockers, assignments, or missing evidence.",
    ),
    xmlBlock("uploaded_document_variables", "No uploaded document payload was supplied in this request."),
  ].join("\n\n");
}

function toVertexContents(history: ChatHistoryItem[] | undefined, message: string): ModelContent[] {
  const prior = (history || [])
    .filter((item) => item.content.trim())
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    }));

  return [
    ...prior,
    {
      role: "user",
      parts: [{ text: xmlBlock("user_current_query", message) }],
    },
  ] as ModelContent[];
}

function toOllamaMessages(systemPrompt: string, history: ChatHistoryItem[] | undefined, message: string) {
  return [
    { role: "system", content: systemPrompt },
    ...(history || []).filter((item) => item.content.trim()),
    { role: "user", content: message },
  ];
}

async function checkVertexStatus() {
  try {
    await vertexClient.models.generateContent({
      model: vertexModel,
      contents: "ping",
      config: { maxOutputTokens: 1 },
    });
    return true;
  } catch {
    return false;
  }
}

async function checkOllamaStatus() {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { models?: Array<{ name?: string }> };
    return Boolean(payload.models?.some((model) => model.name === ollamaModel));
  } catch {
    return false;
  }
}

export async function checkProviderStatus(): Promise<ProviderStatus> {
  const [cloud, local] = await Promise.all([checkVertexStatus(), checkOllamaStatus()]);
  return {
    cloud,
    local,
    active: cloud ? "cloud" : local ? "local" : "offline",
  };
}

function shouldUseCloudTools(request: StreamRequest) {
  return true;
}

function getAllowedToolNames(request: StreamRequest) {
  const preferred = request.intentSignal?.preferredTools || [];
  const enforced = request.sequenceDirective?.enforcedToolNames || [];
  const names = Array.from(new Set([...preferred, ...enforced].filter(Boolean)));
  return names.length ? names : haritaToolDeclarations.map((tool) => tool.name).filter((name): name is string => Boolean(name));
}

async function prepareToolAugmentedConversation(request: StreamRequest, systemPrompt: string): Promise<ModelContent[]> {
  let contents = toVertexContents(request.history, request.message);
  const allowedToolNames = getAllowedToolNames(request);

  for (let round = 0; round < 3; round += 1) {
    const response = await vertexClient.models.generateContent({
      model: vertexModel,
      contents: contents as any,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 1024,
        temperature: 0.2,
        tools: [{ functionDeclarations: haritaToolDeclarations }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
            allowedFunctionNames: allowedToolNames,
          },
        },
      },
    });

    const functionCalls = (response.functionCalls || []).filter((functionCall): functionCall is FunctionCall => Boolean(functionCall.name));
    if (!functionCalls.length) {
      return contents;
    }

    const functionResponses = await executeHaritaToolCalls(functionCalls, request.context, request.writePermission);
    contents = [
      ...contents,
      {
        role: "model",
        parts: functionCalls.map((functionCall) => ({ functionCall })),
      },
      {
        role: "user",
        parts: functionResponses.map((functionResponse) => ({ functionResponse })),
      },
    ];
  }

  throw new Error("Harita tool resolution exceeded the maximum number of rounds.");
}

async function streamFromVertex(request: StreamRequest) {
  const systemPrompt = buildSystemPrompt(
    request.context,
    undefined,
    undefined,
    request.intentSignal,
    request.sequenceDirective,
  );
  const contents = shouldUseCloudTools(request)
    ? await prepareToolAugmentedConversation(request, systemPrompt)
    : toVertexContents(request.history, request.message);

  const stream = await vertexClient.models.generateContentStream({
    model: vertexModel,
    contents: contents as any,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 2048,
      temperature: 0.4,
    },
  });

  for await (const chunk of stream) {
    if (request.signal?.aborted) {
      throw new Error("Client disconnected.");
    }

    const text = chunk.text;
    if (text) {
      request.onToken(text);
    }
  }
}

async function streamFromOllama(request: StreamRequest, systemPrompt: string) {
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel,
      stream: true,
      messages: toOllamaMessages(systemPrompt, request.history, request.message),
    }),
    signal: request.signal,
  });

  if (!response.ok || !response.body) {
    const detail = await response.text();
    throw new Error(detail || `Local fallback failed with HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const packet = JSON.parse(trimmed) as { done?: boolean; message?: { content?: string } };
      const content = packet.message?.content || "";
      if (content) {
        request.onToken(content);
      }
      if (packet.done) {
        return;
      }
    }
  }
}

export async function streamHaritaResponse(request: StreamRequest): Promise<{ provider: "cloud" | "local" }> {
  const status = await checkProviderStatus();
  request.onStatus(status);

  if (status.cloud) {
    try {
      await streamFromVertex(request);
      return { provider: "cloud" };
    } catch (error) {
      if (!status.local) {
        throw error;
      }
    }
  }

  if (status.local) {
    const groundedProjectState = request.groundedProjectState || await buildProjectGrounding(request.context);
    const localGuidebookContext = request.localGuidebookContext || await buildLocalGuidebookContext(request.message, request.context, request.context?.summary);
    const systemPrompt = buildSystemPrompt(
      request.context,
      groundedProjectState,
      localGuidebookContext,
      request.intentSignal,
      request.sequenceDirective,
    );
    request.onStatus({ cloud: false, local: true, active: "local" });
    await streamFromOllama(request, systemPrompt);
    return { provider: "local" };
  }

  throw new Error("All Harita AI providers are currently unavailable.");
}
