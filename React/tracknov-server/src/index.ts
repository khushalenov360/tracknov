import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient as createSupabaseClient } from "./lib/supabase/server";
import { runWithSupabaseAccessToken } from "./lib/supabase/request-auth";
import { documentService } from "./lib/harita-engine/services/document-service";
import { DocumentParser } from "./lib/harita-engine/document-intelligence/DocumentParser";
import { DocumentClassifier } from "./lib/harita-engine/document-intelligence/DocumentClassifier";
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

app.get("/api/assistant/credit-evidence-targets", async (req, res) => {
  const authorization = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
  const projectId = String(req.query.project_id ?? "").trim();

  if (!projectId) {
    return res.status(400).json({ ok: false, error: "Project is required." });
  }

  try {
    await runWithSupabaseAccessToken(accessToken, async () => {
      const user = await resolveCurrentUserFromRequest();
      if (!user) {
        return res.status(401).json({ ok: false, error: "Session expired." });
      }

      const admin = createSupabaseClient();
      const [{ data: membership }, { data: credits }, { data: documents }] = await Promise.all([
        admin
          .from("project_users")
          .select("role")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .maybeSingle(),
        admin
          .from("project_credits")
          .select("id, credit_id, credit_code, credit_name, status, assigned_user_id, responsible_role, documents_required")
          .eq("project_id", projectId)
          .order("credit_code"),
        admin
          .from("project_document")
          .select("project_credit_id, doc_category, is_latest, state, status")
          .eq("project_id", projectId)
          .eq("is_latest", true),
      ]);

      const projectRole = normalizeRole(String(membership?.role ?? user.role));
      const documentsByCredit = new Map<string, Set<string>>();
      for (const document of documents ?? []) {
        const key = String((document as any).project_credit_id ?? "").trim();
        const type = String((document as any).doc_category ?? "").trim();
        if (!key || !type) continue;
        const existing = documentsByCredit.get(key) ?? new Set<string>();
        existing.add(type);
        documentsByCredit.set(key, existing);
      }

      const targets = (credits ?? []).flatMap((credit: any) => {
        const status = String(credit.status ?? "").toLowerCase();
        if (["complete", "closed", "approved"].includes(status)) return [];

        const uploadedTypes = documentsByCredit.get(String(credit.id)) ?? new Set<string>();
        return normalizeDocumentsRequired(credit.documents_required)
          .filter((requirement) => requirement.required)
          .filter((requirement) => canSeeEvidenceTarget({ user, projectRole, credit, requirement }))
          .filter((requirement) => !uploadedTypes.has(requirement.type))
          .map((requirement) => ({
            id: `${credit.id}::${requirement.type}`,
            projectCreditId: credit.id,
            creditId: credit.credit_id ?? null,
            creditCode: credit.credit_code,
            creditName: credit.credit_name,
            docCategory: requirement.type,
            requirementLabel: requirement.label || requirement.type,
            assignedToUser:
              requirement.assigned_user_id === user.id ||
              String(credit.assigned_user_id ?? "").trim() === user.id,
          }));
      });

      return res.status(200).json({
        ok: true,
        targets,
      });
    });
  } catch (error: any) {
    console.error("[TRACKNOV SERVER] Failed to load credit evidence targets:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Could not load evidence targets.",
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
