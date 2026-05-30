import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { workflowOrchestratorService } from "./workflow-orchestrator-service";
import { ragService } from "./rag-service";
import { eventBus } from "@/lib/events/event-bus";
import { computeIgbcScore } from "./igbc-scoring-service";
import { getProjectWorkspace } from "@/lib/data";
import type { CurrentUser } from "@/lib/types";

export type ReviewEventInput = {
  documentId: string;
  projectId: string;
  reviewerId?: string | null;
  reviewerRole?: string | null;
  action: "owner_forward" | "admin_approve" | "owner_reject" | "admin_reject" | "resubmit" | "status_override";
  statusAfter: string;
  remarks?: string | null;
};

export const rejectionTemplateLibrary: Record<string, string> = {
  missing_data: "Missing required information. Please resubmit with all mandatory values clearly visible.",
  incorrect_format: "Document format is incorrect for this requirement. Upload the required format with readable structure.",
  wrong_document: "Wrong document type for this credit. Please upload the exact required evidence for this credit slot.",
  poor_quality: "Document image/scan quality is unclear. Please upload a readable, high-clarity file.",
  outdated_document: "Document is outdated for current review cycle. Please upload the latest valid certificate/record.",
  wrong_credit_mapping: "Document is mapped to the wrong credit. Please remap and resubmit under the correct credit requirement.",
};

export class ReviewService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  private async recordRejectionPattern(params: {
    creditId?: string | null;
    docCategory?: string | null;
    rejectionReason: string;
    suggestedFix?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (!params.creditId || !params.docCategory || !params.rejectionReason) return;

    const { data: existing } = await this.admin
      .from("rejection_patterns")
      .select("id, occurrence_count")
      .eq("credit_id", params.creditId)
      .eq("doc_category", params.docCategory)
      .eq("rejection_reason", params.rejectionReason)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await this.admin
        .from("rejection_patterns")
        .update({
          occurrence_count: Number(existing.occurrence_count ?? 0) + 1,
          suggested_fix: params.suggestedFix ?? null,
          metadata: params.metadata ?? {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      return;
    }

    await this.admin.from("rejection_patterns").insert({
      credit_id: params.creditId,
      doc_category: params.docCategory,
      rejection_reason: params.rejectionReason,
      suggested_fix: params.suggestedFix ?? null,
      occurrence_count: 1,
      metadata: params.metadata ?? {},
    });
  }

  async recordDocumentReviewEvent(input: ReviewEventInput) {
    await this.admin.from("document_reviews").insert({
      document_id: input.documentId,
      project_id: input.projectId,
      reviewer_id: input.reviewerId ?? null,
      reviewer_role: input.reviewerRole ?? null,
      action: input.action,
      status_after: input.statusAfter,
      remarks: input.remarks ?? null,
    });
  }

  async addRemark(user: CurrentUser, params: {
    projectId: string;
    creditId: string;
    role: string;
    body: string;
  }) {
    const { error } = await this.admin.from("remarks").insert({
      credit_id: params.creditId,
      author_id: user.id,
      role: params.role,
      body: params.body,
    });
    if (error) throw error;
  }

  async transitionDocument(user: CurrentUser, params: {
    documentId: string;
    projectId: string;
    newState: string;
    manualSubmit?: boolean;
    updatedEvidence?: boolean;
    remarks?: string | null;
    idempotencyKey?: string | null;
    override?: boolean;
    overrideReason?: string | null;
  }) {
    const actorRole = await this.getActorProjectRole(params.projectId, user);
    if (!actorRole) throw new Error("Unauthorized.");

    const { data: targetDocument } = await this.client
      .from("project_document")
      .select("id, project_credit_id, doc_category, state")
      .eq("id", params.documentId)
      .maybeSingle();

    const result = await workflowOrchestratorService.transition(user, {
      entityType: "document",
      entityId: params.documentId,
      projectId: params.projectId,
      targetState: params.newState as any,
      action: params.manualSubmit ? "submit" : null,
      reason: params.remarks ?? null,
      metadata: {
        manualSubmit: Boolean(params.manualSubmit),
        updatedEvidence: Boolean(params.updatedEvidence),
      },
      idempotencyKey: params.idempotencyKey ?? null,
      override: Boolean(params.override),
      overrideReason: params.overrideReason ?? null,
    });

    if (!result.ok) throw new Error(result.message);

    if (params.newState === "APPROVED") {
      await ragService.ingestApprovedDocument(params.documentId);
    }
    
    // Record immutable review event
    await this.recordDocumentReviewEvent({
      documentId: params.documentId,
      projectId: params.projectId,
      reviewerId: user.id,
      reviewerRole: actorRole,
      action: params.newState === "APPROVED" ? "admin_approve" : 
              params.newState === "UNDER_REVIEW" ? "owner_forward" :
              params.newState === "CLARIFICATION" || params.newState === "REJECTED" ? (actorRole === "owner" ? "owner_reject" : "admin_reject") : "status_override",
      statusAfter: params.newState,
      remarks: params.remarks,
    });

    // Emit Event
    await eventBus.emit({
      type: "REVIEW_COMPLETED",
      payload: {
        documentId: params.documentId,
        projectId: params.projectId,
        status: params.newState,
        userId: user.id,
      }
    });

    if (params.newState === "REJECTED" || params.newState === "CLARIFICATION") {
      const rejectionReason = params.remarks?.trim() || "Rejected without explicit reason";
      const maybeTemplate = rejectionReason.match(/^\[(.+?)\]\s*/)?.[1] ?? null;
      const suggestedFix = maybeTemplate && rejectionTemplateLibrary[maybeTemplate]
        ? rejectionTemplateLibrary[maybeTemplate]
        : null;
      await this.recordRejectionPattern({
        creditId: targetDocument?.project_credit_id ?? null,
        docCategory: targetDocument?.doc_category ?? null,
        rejectionReason,
        suggestedFix,
        metadata: {
          from_state: targetDocument?.state ?? null,
          rejected_by_role: actorRole,
        },
      });

      await eventBus.emit({
        type: "DOCUMENT_REJECTED",
        payload: {
          documentId: params.documentId,
          projectId: params.projectId,
          userId: user.id,
          reason: params.remarks || "No reason provided",
        }
      });
    }

    return result;
  }

  async transitionSubmittal(user: CurrentUser, params: {
    submittalId: string;
    projectId: string;
    newState: string;
    remarks?: string | null;
  }) {
    const result = await workflowOrchestratorService.transition(user, {
      entityType: "submittal",
      entityId: params.submittalId,
      projectId: params.projectId,
      targetState: params.newState as any,
      reason: params.remarks ?? null,
    });
    if (!result.ok) throw new Error(result.message);
    return { ok: true, workflow_state: result.workflow_state };
  }

  async canSubmitProject(projectId: string) {
    const workspace = await getProjectWorkspace(projectId);
    if (!workspace) throw new Error("Project not found.");
    
    const score = computeIgbcScore(workspace);
    return {
      canSubmit: score.mandatory.complete,
      missingMandatory: score.mandatory.total - score.mandatory.approved,
      scorePct: score.overall.scorePct,
      projectedRating: score.overall.projectedRating
    };
  }

  async submitProject(user: CurrentUser, projectId: string) {
    const { canSubmit, missingMandatory } = await this.canSubmitProject(projectId);
    if (!canSubmit) {
      throw new Error(`Cannot submit: ${missingMandatory} mandatory credits are not approved.`);
    }
    const actorRole = await this.getActorProjectRole(projectId, user);
    if (!actorRole) throw new Error("Unauthorized.");

    const idempotencyKey = `project-${projectId}-SUBMITTED-${Date.now()}`;
    const { error: transitionError } = await this.admin.rpc("execute_governed_transition", {
      p_entity_type: "project",
      p_entity_id: projectId,
      p_target_state: "SUBMITTED",
      p_actor_id: user.id,
      p_actor_role: actorRole,
      p_reason: "Project submitted for certification",
      p_idempotency_key: idempotencyKey,
      p_metadata: {},
    });
    if (transitionError) throw transitionError;

    await eventBus.emit({
      type: "REVIEW_COMPLETED", 
      payload: {
        documentId: "",
        projectId,
        status: "SUBMITTED_FOR_CERTIFICATION",
        userId: user.id,
      }
    });

    return { ok: true };
  }

  private async getActorProjectRole(projectId: string, user: CurrentUser) {
    if (user.role === "super_user") return "super_user";
    const { data: membership } = await this.client
      .from("project_users")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    return membership?.role ?? user.role;
  }
}

export const reviewService = new ReviewService();
export const recordDocumentReviewEvent = (input: ReviewEventInput) => reviewService.recordDocumentReviewEvent(input);
