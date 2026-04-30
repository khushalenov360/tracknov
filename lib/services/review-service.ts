import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { transitionDocumentState } from "./document-state-service";
import { eventBus } from "@/lib/events/event-bus";
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
  }) {
    const actorRole = await this.getActorProjectRole(params.projectId, user);
    if (!actorRole) throw new Error("Unauthorized.");

    const result = await transitionDocumentState(this.admin, {
      documentId: params.documentId,
      newState: params.newState as any,
      userId: user.id,
      actorRole,
      manualSubmit: params.manualSubmit,
      updatedEvidence: params.updatedEvidence,
      remarks: params.remarks,
    });

    if (!result.ok) throw new Error(result.error);
    
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

  async bulkReview(user: CurrentUser, params: {
    action: "approve" | "reject";
    documentIds: string[];
    rejectionType?: string;
    remark?: string;
  }) {
    const results = [];
    for (const documentId of params.documentIds) {
      const { data: document } = await this.client
        .from("documents")
        .select("id, workflow_state, project_id, credit_id, uploaded_by, file_name")
        .eq("id", documentId)
        .maybeSingle();

      if (!document) continue;

      const actorRole = await this.getActorProjectRole(document.project_id, user);
      if (!actorRole) continue;

      const canOwnerReview = actorRole === "owner";
      const canFinalReview = ["project_admin", "super_admin", "super_user"].includes(actorRole);

      if (!canOwnerReview && !canFinalReview) continue;

      if (params.action === "approve") {
        const nextState = canOwnerReview ? "UNDER_REVIEW" : "APPROVED";
        if (canOwnerReview && document.workflow_state !== "SUBMITTED") continue;
        if (canFinalReview && document.workflow_state !== "UNDER_REVIEW") continue;

        const transition = await transitionDocumentState(this.admin, {
          documentId,
          newState: nextState as any,
          userId: user.id,
          actorRole,
          manualSubmit: true,
        });

        if (transition.ok) {
           // Record immutable review event
           await this.recordDocumentReviewEvent({
             documentId,
             projectId: document.project_id,
             reviewerId: user.id,
             reviewerRole: actorRole,
             action: canOwnerReview ? "owner_forward" : "admin_approve",
             statusAfter: nextState,
           });

           results.push({ documentId, ok: true });
           
           // Emit Event
           await eventBus.emit({
             type: "REVIEW_COMPLETED",
             payload: {
               documentId,
               projectId: document.project_id,
               status: nextState,
               userId: user.id,
             }
           });
        }
      } else {
        // Reject
        if (canOwnerReview && document.workflow_state !== "SUBMITTED") continue;
        if (canFinalReview && document.workflow_state !== "UNDER_REVIEW") continue;

        const templateMessage = params.rejectionType ? rejectionTemplateLibrary[params.rejectionType] ?? "" : "";
        const baseMessage = params.remark || templateMessage;
        if (!baseMessage || baseMessage.length < 20 || !params.rejectionType) continue;

        const formattedRemark = `[${params.rejectionType}] ${baseMessage}`;
        const transition = await transitionDocumentState(this.admin, {
          documentId,
          newState: "CLARIFICATION",
          userId: user.id,
          actorRole,
          manualSubmit: true,
          remarks: formattedRemark,
        });

        if (transition.ok) {
           // Record immutable review event
           await this.recordDocumentReviewEvent({
             documentId,
             projectId: document.project_id,
             reviewerId: user.id,
             reviewerRole: actorRole,
             action: canOwnerReview ? "owner_reject" : "admin_reject",
             statusAfter: "CLARIFICATION",
             remarks: formattedRemark,
           });

           // Additional side effects for rejection
           if (document.credit_id) {
             await this.admin.from("remarks").insert({
               credit_id: document.credit_id,
               document_id: documentId,
               author_id: user.id,
               role: actorRole,
               body: formattedRemark,
             });
           }
           // Notify uploader
           if (document.uploaded_by) {
             await this.admin.from("notifications").insert({
               project_id: document.project_id,
               credit_id: document.credit_id,
               document_id: documentId,
               user_id: document.uploaded_by,
               body: `Document sent back: ${formattedRemark}`,
             });
           }
           
           // Emit Event
           await eventBus.emit({
             type: "DOCUMENT_REJECTED",
             payload: {
               documentId,
               projectId: document.project_id,
               userId: user.id,
               reason: formattedRemark,
             }
           });
           
           results.push({ documentId, ok: true });
        }
      }
    }
    return results;
  }

  private async getActorProjectRole(projectId: string, user: CurrentUser) {
    if (user.role === "super_user") return "super_user";
    const { data: membership } = await this.client
      .from("project_members")
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

