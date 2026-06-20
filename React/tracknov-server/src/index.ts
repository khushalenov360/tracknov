import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient as createSupabaseClient } from "./lib/supabase/server";
import { runWithSupabaseAccessToken } from "./lib/supabase/request-auth";
import { documentService } from "./lib/harita-engine/services/document-service";
import { reviewService, WorkflowTransitionError } from "./lib/harita-engine/services/review-service";
import { DocumentParser } from "./lib/harita-engine/document-intelligence/DocumentParser";
import { DocumentClassifier } from "./lib/harita-engine/document-intelligence/DocumentClassifier";
import { workflowStateRenderer } from "./lib/core/workflow/state-renderer";
import type { CurrentUser } from "./lib/types";

const app = express();
const PORT = 5101;

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

function normalizeRole(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

async function resolveCurrentUserFromRequest(): Promise<CurrentUser | null> {
  const client = createSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await client
    .from("profiles")
    .select("global_role, disabled_at")
    .eq("user_id", user.id)
    .maybeSingle<{ global_role: string | null; disabled_at: string | null }>();

  if (profile?.disabled_at) {
    return null;
  }

  const roleFromProfile = typeof profile?.global_role === "string" ? normalizeRole(profile.global_role) : null;
  const roleFromMetadata = typeof user.user_metadata?.role === "string" ? normalizeRole(user.user_metadata.role) : null;

  return {
    id: user.id,
    email: user.email ?? "",
    role: (roleFromProfile || roleFromMetadata || "consultant") as CurrentUser["role"],
  };
}

function toHeadersRecord(headers: express.Request["headers"]) {
  const normalized = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      normalized.set(key, value.join(", "));
    } else if (typeof value === "string") {
      normalized.set(key, value);
    }
  }
  return normalized;
}

type EvidenceRequirement = {
  type: string;
  label: string;
  required: boolean;
  assigned_user_id: string | null;
  assigned_role: string | null;
};

type PreparedAttachmentPayload = {
  fileName: string;
  mimeType: string;
  fileSize: number;
  parsedText: string;
  summary: string;
  evidenceType: string;
  hasComplianceSignals: boolean;
  extractedAt: string;
};

const attachmentParser = new DocumentParser();
const attachmentClassifier = new DocumentClassifier();
const COMPLIANCE_SIGNAL_PATTERNS = [
  /\bigbc\b/i,
  /\bgreen\b/i,
  /\bfixture\b/i,
  /\bflow\s*rate\b/i,
  /\blighting\b/i,
  /\bhvac\b/i,
  /\bvoc\b/i,
  /\bmsds\b/i,
  /\benergy\b/i,
  /\bwater\b/i,
  /\bcertificate\b/i,
  /\bdatasheet\b/i,
  /\bdeclaration\b/i,
  /\btechnical\b/i,
  /\bmanufacturer\b/i,
];

function normalizeDocumentsRequired(value: unknown): EvidenceRequirement[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item: any) => ({
      type: typeof item.type === "string" ? item.type : "",
      label: typeof item.label === "string" ? item.label : (typeof item.type === "string" ? item.type : "Document"),
      required: Boolean(item.required),
      assigned_user_id: typeof item.assigned_user_id === "string" ? item.assigned_user_id : null,
      assigned_role: typeof item.assigned_role === "string" ? normalizeRole(item.assigned_role) : null,
    }))
    .filter((item) => Boolean(item.type));
}

function canSeeEvidenceTarget(args: {
  user: CurrentUser;
  projectRole: string;
  credit: any;
  requirement: EvidenceRequirement;
}) {
  const role = normalizeRole(args.projectRole || args.user.role);
  const assignedUserId = String(args.credit?.assigned_user_id ?? "").trim();
  if (args.requirement.assigned_user_id) {
    return args.requirement.assigned_user_id === args.user.id;
  }
  if (assignedUserId) {
    return assignedUserId === args.user.id;
  }
  if (["architect", "mep", "contractor", "consultant"].includes(role)) {
    const requirementRole = args.requirement.assigned_role ? normalizeRole(args.requirement.assigned_role) : "";
    const responsibleRole = String(args.credit?.responsible_role ?? "").trim().toLowerCase();
    return requirementRole ? requirementRole === role : responsibleRole === role;
  }
  return ["owner", "project_admin", "super_admin", "super_user"].includes(role);
}

function hasComplianceSignals(text: string, evidenceType: string) {
  if (evidenceType && evidenceType !== "UNKNOWN") {
    return true;
  }

  return COMPLIANCE_SIGNAL_PATTERNS.some((pattern) => pattern.test(text));
}

function reviewerStatesForRole(role: string) {
  if (["project_admin", "super_admin", "super_user", "l3", "l5"].includes(role)) {
    return ["UNDER_L3_REVIEW", "RESUBMITTED"];
  }

  if (["owner", "l1"].includes(role)) {
    return ["L1_REVIEW"];
  }

  return [];
}

function transitionTargetForAction(action: string) {
  switch (action) {
    case "approve":
      return "APPROVED";
    case "reject":
      return "REJECTED";
    case "request_clarification":
      return "CLARIFICATION";
    case "start_owner_review":
      return "UNDER_REVIEW";
    case "start_admin_review":
      return "UNDER_L3_REVIEW";
    case "submit":
      return "L1_REVIEW";
    case "resubmit":
      return "RESUBMITTED";
    default:
      return null;
  }
}

function summarizeWorkflowDocuments(documents: Array<{ workflow_state?: string | null; state?: string | null }>) {
  const canonicalStates = documents.map((document) => workflowStateRenderer(document.workflow_state || document.state).state);
  const approvedCount = canonicalStates.filter((state) => state === "APPROVED").length;
  const pendingReviewCount = canonicalStates.filter((state) => ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"].includes(state)).length;
  const clarificationCount = canonicalStates.filter((state) => ["CLARIFICATION", "REJECTED"].includes(state)).length;
  const total = documents.length || 1;
  const readinessPercent = Math.max(0, Math.min(100, Math.round((approvedCount / total) * 100)));

  return {
    readinessPercent,
    approvedCount,
    pendingReviewCount,
    clarificationCount,
    validationQueueCount: pendingReviewCount,
  };
}

async function getProjectRoleForUser(client: ReturnType<typeof createSupabaseClient>, projectId: string, userId: string) {
  const { data: membership } = await client
    .from("project_users")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle<{ role: string | null }>();

  return normalizeRole(membership?.role || "");
}

app.get("/api/workspace/:projectId/review-queue", async (req, res) => {
  const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;

  try {
    await runWithSupabaseAccessToken(accessToken, async () => {
      const user = await resolveCurrentUserFromRequest();
      if (!user) {
        return res.status(401).json({ ok: false, error: "Session expired." });
      }

      const projectId = String(req.params.projectId || "").trim();
      if (!projectId) {
        return res.status(400).json({ ok: false, error: "Project id is required." });
      }

      const client = createSupabaseClient();
      const projectRole = await getProjectRoleForUser(client, projectId, user.id);
      const effectiveRole = ["super_user", "super_admin", "project_admin", "l3", "l5"].includes(normalizeRole(user.role))
        ? normalizeRole(user.role)
        : projectRole;
      const reviewStates = reviewerStatesForRole(effectiveRole);

      if (!reviewStates.length) {
        return res.status(403).json({ ok: false, error: "Reviewer queue is restricted to reviewer roles." });
      }

      const { data: documents, error } = await client
        .from("project_document")
        .select("id, project_id, project_credit_id, credit_id, submittal_id, uploaded_by, file_name, uploaded_at, notes, doc_category, state, workflow_state, rejection_reason")
        .eq("project_id", projectId)
        .in("workflow_state", reviewStates)
        .neq("uploaded_by", user.id)
        .order("uploaded_at", { ascending: true });

      if (error) {
        throw error;
      }

      const rows = documents ?? [];
      const creditIds = Array.from(new Set(rows.map((row: any) => row.project_credit_id || row.credit_id).filter(Boolean)));
      const uploaderIds = Array.from(new Set(rows.map((row: any) => row.uploaded_by).filter(Boolean)));

      const [{ data: credits }, { data: profiles }] = await Promise.all([
        creditIds.length
          ? client.from("project_credits").select("id, credit_code, credit_name, category, is_mandatory").in("id", creditIds)
          : Promise.resolve({ data: [] as any[] }),
        uploaderIds.length
          ? client.from("profiles").select("user_id, full_name, email").in("user_id", uploaderIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const creditsById = new Map((credits ?? []).map((credit: any) => [credit.id, credit]));
      const profilesById = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile]));

      const items = rows.map((row: any) => {
        const credit = creditsById.get(row.project_credit_id || row.credit_id);
        const profile = profilesById.get(row.uploaded_by);
        const rendered = workflowStateRenderer(row.workflow_state || row.state);
        const uploaderName = profile?.full_name || profile?.email || "Contributor";

        return {
          id: row.id,
          projectId: row.project_id,
          projectCreditId: row.project_credit_id || row.credit_id || null,
          submittalId: row.submittal_id || null,
          creditCode: credit?.credit_code || "REVIEW",
          creditName: credit?.credit_name || "Evidence Document",
          creditCategory: credit?.category || null,
          isMandatory: Boolean(credit?.is_mandatory),
          fileName: row.file_name,
          docCategory: row.doc_category || "Document",
          uploadedAt: row.uploaded_at,
          uploadedByName: uploaderName,
          workflowState: rendered.state,
          workflowLabel: rendered.label,
          allowedActions: rendered.allowedActions,
          lockState: {
            locked: rendered.locked,
            reason: rendered.blocker,
          },
          remarks: row.rejection_reason || row.notes || "",
        };
      });

      return res.status(200).json({ ok: true, items });
    });
  } catch (error: any) {
    console.error("[TRACKNOV SERVER] Review queue failed:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Failed to load review queue.",
    });
  }
});

app.get("/api/workspace/:projectId/ops-summary", async (req, res) => {
  const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;

  try {
    await runWithSupabaseAccessToken(accessToken, async () => {
      const user = await resolveCurrentUserFromRequest();
      if (!user) {
        return res.status(401).json({ ok: false, error: "Session expired." });
      }

      const projectId = String(req.params.projectId || "").trim();
      if (!projectId) {
        return res.status(400).json({ ok: false, error: "Project id is required." });
      }

      const client = createSupabaseClient();
      const projectRole = await getProjectRoleForUser(client, projectId, user.id);
      const effectiveRole = ["super_user", "super_admin", "project_admin", "l3", "l5"].includes(normalizeRole(user.role))
        ? normalizeRole(user.role)
        : projectRole;

      if (!["project_admin", "super_admin", "super_user", "l3", "l5"].includes(effectiveRole)) {
        return res.status(403).json({ ok: false, error: "Ops summary is restricted to reviewer roles." });
      }

      const [{ data: documents, error: documentsError }, { data: credits, error: creditsError }] = await Promise.all([
        client
          .from("project_document")
          .select("workflow_state, state")
          .eq("project_id", projectId),
        client
          .from("project_credits")
          .select("is_mandatory")
          .eq("project_id", projectId),
      ]);

      if (documentsError) {
        throw documentsError;
      }

      if (creditsError) {
        throw creditsError;
      }

      const workflowSummary = summarizeWorkflowDocuments((documents ?? []) as Array<{ workflow_state?: string | null; state?: string | null }>);
      const mandatoryCreditsCount = (credits ?? []).filter((credit: any) => Boolean(credit.is_mandatory)).length;

      return res.status(200).json({
        ok: true,
        summary: {
          ...workflowSummary,
          mandatoryCreditsCount,
        },
      });
    });
  } catch (error: any) {
    console.error("[TRACKNOV SERVER] Ops summary failed:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Failed to load workspace ops summary.",
    });
  }
});

app.post("/api/workspace/:projectId/review-queue/:documentId/transition", async (req, res) => {
  const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;

  try {
    await runWithSupabaseAccessToken(accessToken, async () => {
      const user = await resolveCurrentUserFromRequest();
      if (!user) {
        return res.status(401).json({ ok: false, error: "Session expired." });
      }

      const projectId = String(req.params.projectId || "").trim();
      const documentId = String(req.params.documentId || "").trim();
      const action = String(req.body?.action || "").trim();
      const remarks = typeof req.body?.remarks === "string" ? req.body.remarks : null;

      if (!projectId || !documentId || !action) {
        return res.status(400).json({ ok: false, error: "Project, document, and action are required." });
      }

      const targetState = transitionTargetForAction(action);
      if (!targetState) {
        return res.status(400).json({ ok: false, error: "Unsupported review action." });
      }

      try {
        const result = await reviewService.transitionDocument(user, {
          documentId,
          projectId,
          newState: targetState,
          remarks,
          idempotencyKey: `react-review-${projectId}-${documentId}-${action}-${Date.now()}`,
        });

        return res.status(200).json({
          ok: true,
          workflowState: result.workflow_state ?? targetState,
          allowedActions: result.allowed_actions ?? [],
        });
      } catch (error: any) {
        if (error instanceof WorkflowTransitionError) {
          const transition = error.transition;
          const statusCode = transition.status === "workflow_failed" || transition.status === "lock_violation" ? 409 : 403;
          return res.status(statusCode).json({
            ok: false,
            error: transition.message || "Failed to transition review item.",
            workflowState: transition.workflow_state ?? null,
            allowedActions: transition.allowed_actions ?? [],
            status: transition.status ?? "workflow_failed",
          });
        }

        throw error;
      }
    });
  } catch (error: any) {
    console.error("[TRACKNOV SERVER] Review transition failed:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Failed to transition review item.",
    });
  }
});

app.post("/api/assistant/attachment-prepare", express.raw({ type: () => true, limit: "60mb" }), async (req, res) => {
  const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;

  try {
    await runWithSupabaseAccessToken(accessToken, async () => {
      const multipartRequest = new Request("http://localhost:5101/api/assistant/attachment-prepare", {
        method: "POST",
        headers: toHeadersRecord(req.headers),
        body: req.body,
        duplex: "half",
      } as RequestInit & { duplex: "half" });

      const formData = await multipartRequest.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return res.status(400).json({ ok: false, error: "A file is required." });
      }

      const user = await resolveCurrentUserFromRequest();
      if (!user) {
        return res.status(401).json({ ok: false, error: "Session expired." });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await attachmentParser.parse(buffer, file.name);
      const parsedText = String(parsed.text || "").trim().slice(0, 12000);
      const evidenceType = attachmentClassifier.classifyText(parsedText, file.name) || "UNKNOWN";
      const complianceSignals = hasComplianceSignals(parsedText, evidenceType);

      const summaryParts = [
        evidenceType !== "UNKNOWN" ? `Detected evidence type: ${evidenceType}.` : "No deterministic evidence type match was found.",
        parsedText ? `Extracted ${parsedText.length} characters of readable text.` : "No readable text could be extracted from this file.",
        complianceSignals ? "Compliance-aligned signals were detected in the attachment." : "No clear compliance-aligned signals were detected in the attachment.",
      ];

      const payload: PreparedAttachmentPayload = {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        parsedText,
        summary: summaryParts.join(" "),
        evidenceType,
        hasComplianceSignals: complianceSignals,
        extractedAt: new Date().toISOString(),
      };

      return res.status(200).json({
        ok: true,
        attachment: payload,
      });
    });
  } catch (error: any) {
    console.error("[TRACKNOV SERVER] Attachment preparation failed:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Attachment preparation failed.",
    });
  }
});

app.post("/api/assistant/credit-evidence-upload", express.raw({ type: () => true, limit: "60mb" }), async (req, res) => {
  const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;

  try {
    await runWithSupabaseAccessToken(accessToken, async () => {
      const multipartRequest = new Request("http://localhost:5101/api/assistant/credit-evidence-upload", {
        method: "POST",
        headers: toHeadersRecord(req.headers),
        body: req.body,
        duplex: "half",
      } as RequestInit & { duplex: "half" });

      const formData = await multipartRequest.formData();
      const projectId = String(formData.get("project_id") ?? "").trim();
      const targetId = String(formData.get("target_id") ?? "").trim();
      const file = formData.get("file");

      if (!projectId || !targetId || !(file instanceof File)) {
        return res.status(400).json({ ok: false, error: "Project, target, and file are required." });
      }

      const user = await resolveCurrentUserFromRequest();
      if (!user) {
        return res.status(401).json({ ok: false, error: "Session expired." });
      }

      const [projectCreditId, docCategory] = targetId.split("::");
      if (!projectCreditId || !docCategory) {
        return res.status(400).json({ ok: false, error: "Invalid upload target." });
      }

      const admin = createSupabaseClient();
      const { data: credit } = await admin
        .from("project_credits")
        .select("id, credit_id, credit_code, credit_name, documents_required")
        .eq("project_id", projectId)
        .eq("id", projectCreditId)
        .maybeSingle();

      if (!credit) {
        return res.status(404).json({ ok: false, error: "Selected credit target no longer exists." });
      }

      const requirement = normalizeDocumentsRequired((credit as any).documents_required).find((item) => item.type === docCategory);
      if (!requirement) {
        return res.status(400).json({ ok: false, error: "Selected evidence requirement is no longer available." });
      }

      const uploadResult = await documentService.uploadDocument(user, {
        projectId,
        creditId: String((credit as any).credit_id ?? ""),
        projectCreditId: String((credit as any).id),
        docCategory,
        requirementSlot: requirement.label || requirement.type,
        notes: `Uploaded through Harita Credit Evidence Analyzer for ${String((credit as any).credit_code ?? "").trim()}.`,
        file,
        idempotencyKey: `harita-${projectId}-${projectCreditId}-${docCategory}-${Date.now()}`,
      });

      return res.status(200).json({
        ok: true,
        documentId: uploadResult.id,
        projectCreditId: credit.id,
        creditId: credit.credit_id ?? null,
        creditCode: credit.credit_code,
        creditName: credit.credit_name,
        docCategory,
        requirementLabel: requirement.label || requirement.type,
        message: `Evidence uploaded for ${credit.credit_code} - ${requirement.label || requirement.type}.`,
        uploadedAt: new Date().toISOString(),
      });
    });
  } catch (error: any) {
    console.error("[TRACKNOV SERVER] Evidence upload failed:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Upload failed.",
    });
  }
});

app.post('/api/credit-evaluations', (req, res) => {
  try {
    const { creditCode, extractionPayload } = req.body;
    console.log(`[TRACKNOV SERVER] Evaluating credit: ${creditCode}`);

    let evaluationResult: any = null;

    if (creditCode === 'EE_Credit1') {
      const { IgbcScoreAuthority } = require('./services/igbc-score-authority');
      evaluationResult = IgbcScoreAuthority.verifyChillerEfficiency(extractionPayload);
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported credit code' });
    }

    setTimeout(() => {
      return res.status(200).json({ success: true, evaluationResult });
    }, 1000);
  } catch (error: any) {
    console.error('[SERVER ERROR INTERCEPT]', error);
    return res.status(500).json({ error: error.message || 'Evaluation thread failed' });
  }
});

app.listen(PORT, () => {
  console.log(`[SERVER ACTIVE] Tracknov business server listening on http://localhost:${PORT}`);
});
