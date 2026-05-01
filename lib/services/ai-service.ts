import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { CurrentUser } from "@/lib/types";

type UploadValidationInput = {
  projectId: string;
  creditId: string;
  projectCreditId?: string;
  fileName: string;
  fileType?: string;
  fileSize: number;
  docCategory: string;
};

type UploadValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  expectedTypes: string[];
};

export class AIService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  async validateUploadCandidate(input: UploadValidationInput): Promise<UploadValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const expectedTypes: string[] = [];

    const allowedExtensions = new Set(["pdf", "docx", "png", "jpg", "jpeg"]);
    const extension = input.fileName.split(".").pop()?.toLowerCase() ?? "";

    if (!extension || !allowedExtensions.has(extension)) {
      errors.push("Unsupported file extension. Use PDF, DOCX, PNG, or JPG.");
    }

    if (input.fileSize > 10 * 1024 * 1024) {
      errors.push("File exceeds 10 MB limit.");
    }

    if (!/^[a-zA-Z0-9 _.\-()]+$/.test(input.fileName)) {
      warnings.push("Filename has special characters. Rename for better traceability.");
    }

    const { data: credit, error: creditError } = await this.admin
      .from("credits")
      .select("credit_name, documents_required, what_to_submit")
      .eq("id", input.creditId)
      .maybeSingle();

    if (creditError || !credit) {
      errors.push("Credit mapping could not be validated.");
      return { ok: false, errors, warnings, expectedTypes };
    }

    const requiredTypes = ((credit.documents_required ?? []) as Array<{ type?: string; required?: boolean }>)
      .filter((item) => Boolean(item?.type))
      .map((item) => String(item.type));

    expectedTypes.push(...requiredTypes);
    if (requiredTypes.length > 0 && !requiredTypes.includes(input.docCategory)) {
      errors.push(
        `Document type '${input.docCategory}' is not mapped to this credit. Allowed types: ${requiredTypes.join(", ")}.`,
      );
    }

    const guidance = String(credit.what_to_submit ?? "").toLowerCase();
    if (guidance && input.docCategory.toLowerCase().includes("narrative") && !guidance.includes("narrative")) {
      warnings.push("This credit guidance may expect evidence beyond narrative. Review 'What to submit' before upload.");
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      expectedTypes,
    };
  }

  async getAISuggestions(documentId: string) {
    const { data: document } = await this.client
      .from("documents")
      .select("doc_category, credit_id")
      .eq("id", documentId)
      .maybeSingle();

    if (!document) return [];

    const { data: patterns } = await this.client
      .from("rejection_patterns")
      .select("rejection_reason, suggested_fix, occurrence_count")
      .eq("credit_id", document.credit_id)
      .eq("doc_category", document.doc_category)
      .order("occurrence_count", { ascending: false })
      .limit(3);

    const patternSuggestions = (patterns ?? []).map((item) => ({
      type: "warning",
      message: item.suggested_fix
        ? `${item.rejection_reason} Fix: ${item.suggested_fix}`
        : item.rejection_reason,
      frequency: item.occurrence_count ?? 1,
    }));

    const baselineSuggestions = [
      {
        type: "info",
        message: `Ensure that the ${document.doc_category} includes a clear date and project name.`,
      },
    ];

    return [...baselineSuggestions, ...patternSuggestions];
  }

  async getProjectRiskScore(projectId: string) {
    const { data: docs } = await this.client
      .from("documents")
      .select("status, workflow_state, uploaded_at")
      .eq("project_id", projectId);

    const { data: usage } = await this.client
      .from("project_usage_summary")
      .select("document_credits_remaining, consultant_credits_remaining")
      .eq("project_id", projectId)
      .maybeSingle();

    const rejections = docs?.filter((d) => d.status === "rejected").length ?? 0;
    const pendingReview = docs?.filter((d) => {
      const state = String(d.workflow_state ?? "").toUpperCase();
      return state === "SUBMITTED" || state === "UNDER_REVIEW" || state === "CLARIFICATION";
    }).length ?? 0;

    const lastUploadMs = docs?.length
      ? Math.max(...docs.map((d) => new Date(d.uploaded_at ?? 0).getTime()).filter((value) => Number.isFinite(value)))
      : 0;
    const inactiveDays = lastUploadMs ? Math.floor((Date.now() - lastUploadMs) / (1000 * 60 * 60 * 24)) : 30;

    const remainingDocTokens = Number(usage?.document_credits_remaining ?? 0);
    const remainingConsultTokens = Number(usage?.consultant_credits_remaining ?? 0);

    let score = 100;
    score -= rejections * 12;
    score -= pendingReview * 4;
    score -= inactiveDays >= 7 ? Math.min(25, inactiveDays - 6) : 0;
    score -= remainingDocTokens <= 10 ? 15 : 0;
    score -= remainingConsultTokens <= 10 ? 10 : 0;
    score = Math.max(0, score);

    const level = score > 80 ? "low" : score > 55 ? "medium" : "high";
    return {
      score,
      level,
      indicators: [
        { label: "Rejections", value: rejections, status: rejections > 2 ? "warning" : "ok" },
        { label: "Pending review", value: pendingReview, status: pendingReview > 5 ? "warning" : "ok" },
        { label: "Inactive days", value: inactiveDays, status: inactiveDays > 7 ? "warning" : "ok" },
        { label: "Doc tokens left", value: remainingDocTokens, status: remainingDocTokens <= 10 ? "warning" : "ok" },
        { label: "Consult tokens left", value: remainingConsultTokens, status: remainingConsultTokens <= 10 ? "warning" : "ok" },
      ],
    };
  }
}

export const aiService = new AIService();
