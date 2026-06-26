import { FunctionCallingConfigMode, GoogleGenAI, Type, type FunctionCall } from "@google/genai";
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
    pageCount?: number;
    tokenEstimate?: number;
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
  attachment?: AgentChatRequest["attachment"];
  attachmentTargetId?: string | null;
  signal?: AbortSignal;
  onToken: (content: string) => void;
  onStatus: (status: ProviderStatus) => void;
};

const vertexClient = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT || "mock-project",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
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

function detectGreeting(message: string) {
  return /^(hi|hello|hey|hii|good morning|good afternoon|good evening)\b/i.test(message.trim());
}

function detectThanks(message: string) {
  return /^(thanks|thank you|ok thanks|great thanks|noted thanks)\b/i.test(message.trim());
}

function extractActiveCreditReference(source: string) {
  const directCode = source.match(/\b(?:EDA|EE|IE|IM|MR|SS|WC|WE)\s*[A-Z]?\s*\d+\b/i);
  if (directCode) {
    return directCode[0].replace(/\s+/g, " ").trim().toUpperCase();
  }

  const compactCode = source.match(/\b(?:EDA|EE|IE|IM|MR|SS|WC|WE)[A-Z]?\d+\b/i);
  return compactCode ? compactCode[0].toUpperCase() : null;
}

function extractAttachmentName(history?: ChatHistoryItem[]) {
  if (!history?.length) return null;
  const recentText = history
    .slice(-8)
    .map((item) => item.content)
    .join("\n");

  const namedFile = recentText.match(/\b[\w\s.-]+\.(pdf|xlsx|xls|csv|docx|png|jpg|jpeg)\b/i);
  return namedFile ? namedFile[0].trim() : null;
}

function buildConversationMemory(
  message: string,
  context?: HaritaContext,
  history?: ChatHistoryItem[],
) {
  const recentUserMessages = (history || [])
    .filter((item) => item.role === "user")
    .slice(-3)
    .map((item) => item.content.trim())
    .filter(Boolean);
  const activeCredit = extractActiveCreditReference(
    [context?.currentItem || "", context?.summary || "", ...recentUserMessages, message].join(" "),
  );
  const activeDocument = extractAttachmentName(history);

  return {
    active_project: context?.title || context?.projectId || "unresolved",
    active_credit_reference: activeCredit || "unresolved",
    active_document_name: activeDocument || "unresolved",
    latest_user_objective: message.trim(),
    recent_user_messages: recentUserMessages,
  };
}

function buildSystemPrompt(
  message: string,
  context?: HaritaContext,
  groundedProjectState?: string,
  localGuidebookContext?: string,
  intentSignal?: HaritaIntentSignal,
  sequenceDirective?: SequenceDirective,
  history?: ChatHistoryItem[],
  attachment?: AgentChatRequest["attachment"],
  attachmentTargetId?: string | null,
) {
  const guidebookStatus = getGuidebookStatus();
  const memory = buildConversationMemory(message, context, history);
  const greeting = detectGreeting(message);
  const thanks = detectThanks(message);

  let programmaticAuditResults = "No compliance audit executed.";
  if (attachment && attachmentTargetId === "WATER_CALCULATION") {
    try {
      const { executeTechnicalDocumentAudit } = require("../../../React/tracknov-server/src/services/ComplianceAssertionEngine");
      
      const rawText = attachment.parsedText || "";
      const modelMatch = rawText.match(/FLV-CHR-[0-9A-Z]+/i);
      const flowMatch = rawText.match(/(?:\b|\s)([0-9.]+)\s*\/\s*([0-9.]+)\s*LPF\b/i);
      const pressureMatch = rawText.match(/([0-9.]+)\s*(?:bar|psi|kPa)/i);
      const standardsMatch = rawText.match(/\bIS\s*[:\s]*(?:1264(?:-1997)?|319(?:-1989)?)\b/ig) || [];

      const payload = {
        documentId: attachment.fileName,
        modelIdentifier: modelMatch ? modelMatch[0] : "UNKNOWN",
        flushRates: {
          full: flowMatch ? parseFloat(flowMatch[2]) : 0,
          half: flowMatch ? parseFloat(flowMatch[1]) : 0,
        },
        calibrationPressureBar: pressureMatch ? parseFloat(pressureMatch[1]) : 0,
        extractedStandards: Array.from(new Set(standardsMatch)),
      };

      const auditResult = executeTechnicalDocumentAudit(payload);
      programmaticAuditResults = JSON.stringify({
        STATUS: "PROGRAMMATIC_VERIFICATION_COMPLETE",
        TARGET_SLOT: attachmentTargetId,
        BASELINE_CONFIDENCE_SCORE: auditResult.submissionConfidence,
        CALCULATED_POINTS: auditResult.allocatedPoints,
        QC_PASS: auditResult.materialQCPass,
        IDENTIFIED_GAPS: auditResult.gapsIdentified
      }, null, 2);
    } catch (err) {
      programmaticAuditResults = "Audit Engine Error: " + (err as Error).message;
    }
  }

  return [
    xmlBlock(
      "system_persona_boundaries",
      [
        "You are Harita, Tracknov's senior IGBC consultant and Tracknov product expert.",
        "Ban filler, pleasantries, and decorative openings.",
        "Every answer must be direct, operational, and grounded in available project context.",
        "Never invent project evidence, assignments, metrics, or compliance points.",
        "If evidence is missing, say exactly what is missing and what the next best action is.",
        "For compliance questions, lead with the core conclusion first.",
        "Do not say data is unavailable if the grounded project context already contains the answer.",
        "Never expose internal terms such as tool call, retrieval, RAG, vector search, prompt, governance chain, router, telemetry, or provider fallback.",
        "If the user is greeting you or thanking you, reply naturally in one or two short sentences and do not dump project status unless the user asks for it.",
        "If the user asks a broad exploratory question, answer the question first, then optionally suggest the next best Tracknov-specific follow-up.",
        "",
        "[CRITICAL SYSTEM ENFORCEMENT RULES]",
        "1. If a `programmatic_compliance_audit` block is supplied in the context, you are strictly FORBIDDEN from inventing, guessing, or estimating the reasons behind the confidence score.",
        "2. You MUST explicitly read the `IDENTIFIED_GAPS` array. Your text output explaining the score must ONLY list the specific strings present inside that array (e.g., Calibration Mismatches or Material Standard Gaps).",
        "3. Do NOT cross-contaminate slot evaluations. If the `Slot Target` is a technical document type (like `WATER_CALCULATION`), do not declare that the score is penalized due to macro-level milestones (like a missing 'Narrative') unless the user explicitly asks for a full-credit overview."
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
        "Do not force labeled sections for greetings, acknowledgements, or simple document-summary questions.",
      ].join("\n"),
    ),
    xmlBlock(
      "response_format_contract",
      [
        `interaction_mode: ${intentSignal?.lane || "exploratory"}`,
        greeting || thanks
          ? "For greeting/acknowledgement turns: reply in plain natural language, max two short sentences."
          : "For analytical and operational turns: Provide a conversational but concise 'Gemini-like' response. Deliver the core insight immediately without long preambles. Keep responses to a few short paragraphs unless the user explicitly asks for a detailed breakdown. Speak directly to the user as a trusted consultant.",
        "If the user explicitly asks for a count, total, owner, assignment, blocker, or credit list, answer that first before anything else.",
        "If the user asks what a document is about, summarize the file itself naturally before talking about credit mapping.",
      ].join("\n"),
    ),
    xmlBlock("conversation_memory", JSON.stringify(memory, null, 2)),
    xmlBlock(
      "intent_router_signal",
      JSON.stringify(
        {
          intent: intentSignal?.intent || "general",
          lane: intentSignal?.lane || "exploratory",
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
      groundedProjectState || "Live project state must be fetched through runtime tools such as get_project_snapshot, get_credit_applicability, get_evidence_intelligence, get_score_model, and get_clarification_intelligence.",
    ),
    xmlBlock(
      "runtime_tool_contract",
      groundedProjectState
        ? "Fallback mode: use the supplied grounded state because live tool execution is unavailable."
        : "Cloud mode: fetch live Tracknov data through tools before making claims about points, blockers, dependencies, assignments, clarification loops, or missing evidence.",
    ),
    xmlBlock(
      "uploaded_document_variables",
      attachment 
        ? `Filename: ${attachment.fileName}\nSlot Target: ${attachmentTargetId || "None"}\n${
            attachmentTargetId 
              ? `SLOT FILTERING ENFORCED: Exclude alternate categories (like Narrative or Specs) from text calculation summaries. Focus solely on ${attachmentTargetId}.` 
              : ""
          }` 
        : "No uploaded document payload was supplied in this request."
    ),
    xmlBlock("programmatic_compliance_audit", programmaticAuditResults),
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
  if (request.intentSignal?.lane === "conversational") {
    return false;
  }

  if (request.intentSignal?.intent === "general" && request.intentSignal?.confidence === "low") {
    return false;
  }

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
        tools: [{ functionDeclarations: haritaToolDeclarations.filter((t) => t.name && allowedToolNames.includes(t.name)) }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
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
    request.message,
    request.context,
    undefined,
    undefined,
    request.intentSignal,
    request.sequenceDirective,
    request.history,
    request.attachment,
    request.attachmentTargetId
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
      request.message,
      request.context,
      groundedProjectState,
      localGuidebookContext,
      request.intentSignal,
      request.sequenceDirective,
      request.history,
      request.attachment,
      request.attachmentTargetId
    );
    request.onStatus({ cloud: false, local: true, active: "local" });
    await streamFromOllama(request, systemPrompt);
    return { provider: "local" };
  }

  throw new Error("All Harita AI providers are currently unavailable.");
}

export async function generateStructuredAudit(
  systemInstruction: string,
  documentText: string,
  guidebookContext: string,
  userMessage: string
) {
  const contents = [
    {
      role: "user",
      parts: [
        { text: "Here is the IGBC Reference Manual Context:\n" + guidebookContext },
        { text: "\nHere is the Parsed Document Text to analyze:\n" + documentText },
        { text: "\nUser Message:\n" + (userMessage || "Evaluate this document") }
      ],
    }
  ];

  const response = await vertexClient.models.generateContent({
    model: vertexModel,
    contents: contents as any,
    config: {
      systemInstruction,
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          confidenceScore: { type: Type.INTEGER, description: "Confidence score from 0 to 100 based on the evidence matching the policy" },
          missingEvidence: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of missing requirements or evidence gaps" },
          detailedMarkdownNarrative: { type: Type.STRING, description: "A conversational response addressing the User Message. If the user asks for details or a breakdown, provide a detailed analysis. If it is a generic evaluation, provide a highly concise summary (2-3 sentences max) explaining the core insight." }
        },
        required: ["confidenceScore", "missingEvidence", "detailedMarkdownNarrative"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate structured audit");
  }

  return JSON.parse(response.text);
}

export async function generateDiscoveryAdvisory(
  documentText: string,
  catalogContext: string
): Promise<{ advisoryMarkdown: string; suggestedCredits: string[] }> {
  const systemInstruction = `You are Harita, a digital space-planner and regulatory auditor for IGBC Green Interiors.
Your task is to analyze an unmapped document and determine exactly where it fits within the IGBC roadmap.

Internal Methodology (Do this analysis, but do not output the steps):
1. Visual Ingestion & Architectural Sifting
2. Target Variable Extraction
3. Multi-File Policy Mapping

Output Requirements:
Provide a highly conversational, concise "Gemini-like" summary (maximum 3 sentences). 
Tell the user what the document is, which credits it matches best, and a quick sentence on why. 
Deliver the core insight immediately without a long preamble. End by naturally asking if they would like a detailed breakdown.
Do NOT output a massive wall of text. Do NOT use headers like "Visual Ingestion" or "Target Variable Extraction".`;

  const contents = [
    {
      role: "user",
      parts: [
        { text: "Here is the IGBC Projects Credit Catalog reference:\n" + catalogContext },
        { text: "\nHere is the Parsed Document Text to analyze:\n" + documentText }
      ],
    }
  ];

  const response = await vertexClient.models.generateContent({
    model: vertexModel,
    contents: contents as any,
    config: {
      systemInstruction,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          advisoryMarkdown: { type: Type.STRING, description: "A concise, conversational summary (2-3 sentences max) explaining the document and the suggested credits." },
          suggestedCredits: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of exactly matched credit codes (e.g. 'EDA C2', 'IEQ C9') that are highly relevant to the document." }
        },
        required: ["advisoryMarkdown", "suggestedCredits"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate discovery advisory");
  }

  return JSON.parse(response.text);
}
