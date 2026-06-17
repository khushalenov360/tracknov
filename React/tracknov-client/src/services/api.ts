import { supabase } from "../lib/supabaseClient";

export type HaritaContext = {
  projectId?: string;
  title: string;
  summary: string;
  currentItem: string;
};

export type HaritaStatus = {
  cloud: boolean;
  local: boolean;
  active?: "cloud" | "local" | "offline";
};

export type HaritaMessageHistoryItem = {
  role: "assistant" | "user";
  content: string;
};

export type HaritaApiError = Error & {
  code?: string;
  detail?: string;
  retryable?: boolean;
};

export type CreditEvidenceTarget = {
  id: string;
  projectCreditId: string;
  creditId: string | null;
  creditCode: string;
  creditName: string;
  docCategory: string;
  requirementLabel: string;
  assignedToUser: boolean;
};

export type CreditEvidenceUploadResponse = {
  ok?: boolean;
  message?: string;
  documentId?: string;
  projectCreditId?: string;
  creditId?: string | null;
  creditCode?: string;
  creditName?: string;
  docCategory?: string;
  requirementLabel?: string;
  uploadedAt?: string;
  error?: string;
};

export type HaritaPreparedAttachment = {
  fileName: string;
  mimeType: string;
  fileSize: number;
  parsedText: string;
  summary: string;
  evidenceType: string;
  hasComplianceSignals: boolean;
  extractedAt: string;
};

export type HaritaActionButton = {
  id: string;
  label: string;
  kind: "evaluate_credit" | "explore_matches" | "refer_reviewer" | "map_document_directly";
  targetId?: string;
  creditCode?: string;
  confidence?: number;
};

export type HaritaDocumentMatch = {
  targetId: string;
  creditCode: string;
  creditName: string;
  confidence: number;
  rationale: string;
};

export type HaritaAuditResult = {
  targetId: string;
  creditCode: string;
  creditName: string;
  confidence: number;
  band: "high_risk" | "medium_risk" | "low_risk";
  rationale: string;
  missingEvidence: string[];
};

export type HaritaResponseMeta = {
  kind: "document_analysis";
  mode: "discovery" | "audit" | "irrelevant";
  attachment: HaritaPreparedAttachment;
  matches?: HaritaDocumentMatch[];
  audit?: HaritaAuditResult;
  actions?: HaritaActionButton[];
};

type HaritaStreamCallbacks = {
  onReady?: () => void;
  onStatus?: (status: HaritaStatus) => void;
  onToken: (chunk: string) => void;
  onMeta?: (meta: HaritaResponseMeta) => void;
};

const HARITA_AI_BASE_URL = "http://localhost:5001/api/v1/agent";
const TRACKNOV_SERVER_BASE_URL = "http://localhost:5101";

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

async function getAuthToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

async function throwHaritaError(response: Response): Promise<never> {
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = { message: await response.text() };
  }

  const error = new Error(payload?.message || "Failed to communicate with Harita") as HaritaApiError;
  error.code = payload?.error;
  error.detail = payload?.detail;
  error.retryable = Boolean(payload?.retryable);
  throw error;
}

export async function evaluateCreditMetrics(creditCode: string, payload: any): Promise<any> {
  try {
    const response = await fetch(`${TRACKNOV_SERVER_BASE_URL}/api/credit-evaluations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        creditCode,
        extractionPayload: payload,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to evaluate credit payload");
    }

    return await response.json();
  } catch (error) {
    console.error("API Error during credit evaluation:", error);
    throw error;
  }
}

export async function fetchHaritaStatus(): Promise<HaritaStatus> {
  const response = await fetch(`${HARITA_AI_BASE_URL}/status`);
  if (!response.ok) {
    throw new Error("Failed to fetch Harita status");
  }
  return await response.json();
}

export async function fetchCreditEvidenceTargets(projectId: string): Promise<CreditEvidenceTarget[]> {
  const token = await getAuthToken();
  const response = await fetch(`${TRACKNOV_SERVER_BASE_URL}/api/assistant/credit-evidence-targets?project_id=${encodeURIComponent(projectId)}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; targets?: CreditEvidenceTarget[]; error?: string };
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error || "Could not load evidence targets.") as HaritaApiError;
    error.retryable = true;
    throw error;
  }

  return Array.isArray(payload.targets) ? payload.targets : [];
}

export async function prepareHaritaAttachment(
  file: File,
): Promise<HaritaPreparedAttachment> {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${TRACKNOV_SERVER_BASE_URL}/api/assistant/attachment-prepare`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; attachment?: HaritaPreparedAttachment; error?: string };
  if (!response.ok || !payload.ok || !payload.attachment) {
    const error = new Error(payload.error || "Attachment analysis failed.") as HaritaApiError;
    error.retryable = true;
    throw error;
  }

  return payload.attachment;
}

export async function uploadCreditEvidence(
  projectId: string,
  targetId: string,
  file: File,
): Promise<CreditEvidenceUploadResponse> {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append("project_id", projectId);
  formData.append("target_id", targetId);
  formData.append("file", file);

  const response = await fetch(`${TRACKNOV_SERVER_BASE_URL}/api/assistant/credit-evidence-upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as CreditEvidenceUploadResponse;
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error || payload.message || "Evidence upload failed.") as HaritaApiError;
    error.retryable = true;
    throw error;
  }

  return payload;
}

export async function streamHaritaMessage(
  message: string,
  context: HaritaContext,
  history: HaritaMessageHistoryItem[],
  attachment: HaritaPreparedAttachment | null,
  attachmentTargetId: string | null,
  callbacks: HaritaStreamCallbacks,
): Promise<void> {
  const response = await fetch(`${HARITA_AI_BASE_URL}/chat`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ message, context, history, attachment, attachmentTargetId }),
  });

  if (!response.ok || !response.body) {
    await throwHaritaError(response);
  }

  const streamBody = response.body;
  if (!streamBody) {
    const error = new Error("Harita stream body is unavailable.") as HaritaApiError;
    error.retryable = true;
    throw error;
  }

  const reader = streamBody.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";

    for (const frame of frames) {
      const line = frame
        .split("\n")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith("data:"));

      if (!line) continue;

      const payload = JSON.parse(line.slice(5).trim()) as {
        type?: string;
        content?: string;
        message?: string;
        cloud?: boolean;
        local?: boolean;
        active?: "cloud" | "local" | "offline";
        meta?: HaritaResponseMeta;
      };

      if (payload.type === "ready") {
        callbacks.onReady?.();
        continue;
      }

      if (payload.type === "status") {
        callbacks.onStatus?.({
          cloud: Boolean(payload.cloud),
          local: Boolean(payload.local),
          active: payload.active,
        });
        continue;
      }

      if (payload.type === "token" && payload.content) {
        callbacks.onToken(payload.content);
        continue;
      }

      if (payload.type === "meta" && payload.meta) {
        callbacks.onMeta?.(payload.meta);
        continue;
      }

      if (payload.type === "error") {
        const error = new Error(payload.message || "Harita streaming failed.") as HaritaApiError;
        error.retryable = true;
        throw error;
      }
    }
  }
}
