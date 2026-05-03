import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordDocumentReviewEvent } from "@/lib/services/review-service";
import { canEditDocumentStatusAtAnyStage } from "@/lib/rbac";
import { eventBus } from "@/lib/events/event-bus";
import { notifyUsers, getProjectMembersByRoles } from "./notification-service";
import { logDocumentActivity } from "./activity-service";

type SupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>;

export type CanonicalReviewState =
  | "uploaded"
  | "owner_review"
  | "admin_review"
  | "approved"
  | "rejected";

export type WorkflowState =
  | "DRAFT"
  | "READY"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CLARIFICATION"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED";

export function toCanonicalReviewState(state: WorkflowState): CanonicalReviewState {
  switch (state) {
    case "DRAFT":
    case "READY":
      return "uploaded";
    case "SUBMITTED":
      return "owner_review";
    case "UNDER_REVIEW":
    case "CLARIFICATION":
    case "RESUBMITTED":
      return "admin_review";
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    default:
      return "uploaded";
  }
}

export function fromCanonicalReviewState(state: CanonicalReviewState): WorkflowState {
  switch (state) {
    case "uploaded":
      return "READY";
    case "owner_review":
      return "SUBMITTED";
    case "admin_review":
      return "UNDER_REVIEW";
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    default:
      return "READY";
  }
}

const allowedTransitions: Record<WorkflowState, WorkflowState[]> = {
  DRAFT: ["READY"],
  READY: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "CLARIFICATION", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "CLARIFICATION", "REJECTED"],
  CLARIFICATION: ["RESUBMITTED"],
  RESUBMITTED: ["UNDER_REVIEW"],
  APPROVED: [],
  REJECTED: [],
};

// Consistently using consolidated utility services.

// --- Logic ---

async function hasReviewerAssigned(writer: SupabaseClient, projectId: string) {
  const { data } = await writer
    .from("project_users")
    .select("id")
    .eq("project_id", projectId)
    .in("role", ["owner", "project_admin", "super_admin", "super_user"])
    .limit(1);
  return Boolean(data?.length);
}

async function hasAllRequiredDocsForCredit(writer: SupabaseClient, creditId: string) {
  const { data: credit } = await writer
    .from("project_credits")
    .select("credit_template_id")
    .eq("id", creditId)
    .maybeSingle();

  if (!credit?.credit_template_id) return true;

  const { data: template } = await writer
    .from("credit_template")
    .select("documents_required")
    .eq("id", credit.credit_template_id)
    .maybeSingle();

  const requirements = ((template?.documents_required ?? []) as Array<{ type?: string; required?: boolean }>).filter(
    (entry) => Boolean(entry.type) && Boolean(entry.required),
  );
  if (!requirements.length) {
    return true;
  }

  const requiredTypes = new Set(requirements.map((entry) => String(entry.type)));
  const { data: docs } = await writer
    .from("project_document")
    .select("doc_category")
    .eq("project_credit_id", creditId)
    .in("state", ["READY", "SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "APPROVED"]);
  const presentTypes = new Set((docs ?? []).map((item: { doc_category: string }) => item.doc_category));

  for (const type of requiredTypes) {
    if (!presentTypes.has(type)) {
      return false;
    }
  }
  return true;
}

export async function transitionDocumentState(
  writer: SupabaseClient,
  {
    documentId,
    newState,
    userId,
    actorRole,
    manualSubmit = false,
    updatedEvidence = false,
    remarks = null,
    override = false,
    overrideReason = null,
  }: {
    documentId: string;
    newState: WorkflowState;
    userId?: string | null;
    actorRole: string;
    manualSubmit?: boolean;
    updatedEvidence?: boolean;
    remarks?: string | null;
    override?: boolean;
    overrideReason?: string | null;
  },
) {
  const { data: document } = await writer
    .from("project_document")
    .select("id, project_id, project_credit_id, credit_id, state, file_name, rejection_reason")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) {
    return { ok: false as const, error: "Document not found." };
  }

  const currentState = (document.state ?? "DRAFT") as WorkflowState;
  const isOverride = Boolean(override);
  const normalizedOverrideReason = overrideReason?.trim() || null;
  
  // Role check
  const role = String(actorRole);
  const l0Roles = ["consultant", "architect", "mep", "contractor"];
  const l1Roles = ["owner"];
  const l2Roles = ["client", "l2_reserved"];
  const l3Roles = ["project_admin", "super_admin"];
  const l5Roles = ["super_user"];
  const canStatusEditAtAnyStage = canEditDocumentStatusAtAnyStage(role as any);

  // 1. Validate transition
  const nextAllowed = allowedTransitions[currentState] ?? [];
  const isAllowed = nextAllowed.includes(newState) || canStatusEditAtAnyStage || isOverride;
  
  if (!isAllowed && currentState !== newState) {
    return {
      ok: false as const,
      error: `Invalid state transition ${currentState} -> ${newState}.`,
    };
  }

  if (isOverride) {
    const canOverride = ["super_user", "super_admin", "project_admin"].includes(role);
    if (!canOverride) {
      return { ok: false as const, error: "Override is allowed only for admin roles." };
    }
    if (!normalizedOverrideReason) {
      return { ok: false as const, error: "Override reason is mandatory." };
    }
  }

  if (!isOverride && l2Roles.includes(role) && newState !== currentState) {
    return { ok: false as const, error: "L2 role is read-only and cannot change workflow state." };
  }
  if (!isOverride && l0Roles.includes(role) && !["DRAFT", "READY"].includes(newState)) {
    return { ok: false as const, error: "L0 role cannot move document beyond READY." };
  }
  if (!isOverride && l1Roles.includes(role) && !["UNDER_REVIEW", "CLARIFICATION", "REJECTED"].includes(newState)) {
    return { ok: false as const, error: "L1 role can only perform owner-stage review actions." };
  }
  if (!isOverride && ["APPROVED", "REJECTED", "CLARIFICATION"].includes(newState) && !(l3Roles.includes(role) || l5Roles.includes(role) || (l1Roles.includes(role) && (newState === "CLARIFICATION" || newState === "REJECTED")))) {
    if (newState === "APPROVED") {
        return { ok: false as const, error: "Only L3 roles can approve documents." };
    }
  }
  if (!isOverride && newState === "UNDER_REVIEW" && !(l1Roles.includes(role) || l5Roles.includes(role))) {
    return { ok: false as const, error: "Only L1 or L5 can move document into admin review." };
  }

  // Business rules
  if (currentState === "DRAFT" && newState === "READY") {
    const ready = await hasAllRequiredDocsForCredit(writer, document.project_credit_id);
    if (!ready) {
      return { ok: false as const, error: "Cannot mark READY until all required document types exist for this credit." };
    }
  }

  if (currentState === "READY" && newState === "SUBMITTED" && !manualSubmit) {
    return { ok: false as const, error: "READY to SUBMITTED requires manual trigger." };
  }

  if (currentState === "SUBMITTED" && newState === "UNDER_REVIEW") {
    const hasReviewer = await hasReviewerAssigned(writer, document.project_id);
    if (!hasReviewer) {
      return { ok: false as const, error: "Cannot move to UNDER_REVIEW without reviewer assignment." };
    }
  }

  if (currentState === "CLARIFICATION" && newState === "RESUBMITTED" && !updatedEvidence) {
    return { ok: false as const, error: "Cannot resubmit without updated evidence." };
  }

  // 2. Perform Update
  const payload: any = {
    state: newState,
  };

  if (remarks) {
    payload.rejection_reason = remarks;
  } else if (newState === "RESUBMITTED" || newState === "READY" || newState === "DRAFT") {
    payload.rejection_reason = "";
  }

  if (newState === "RESUBMITTED" || newState === "READY" || newState === "DRAFT" || newState === "SUBMITTED") {
    // Reset review metadata for new cycles
    payload.owner_reviewed_by = null;
    payload.owner_reviewed_at = null;
    payload.reviewed_by = null;
    payload.reviewed_at = null;
  }

  const { error: updateError } = await writer
    .from("project_document")
    .update(payload)
    .eq("id", documentId);

  if (updateError) {
    return { ok: false as const, error: updateError.message };
  }

  // 3. Side Effects (Logging, Review Recording, Notifications)
  
  // State history
  await writer.from("workflow_logs").insert({
    project_id: document.project_id,
    entity_type: "document",
    entity_id: documentId,
    state: newState,
    previous_state: currentState,
    actor_id: userId ?? null,
    is_override: isOverride,
    override_reason: normalizedOverrideReason,
  });

  // Determine Review Action
  let reviewAction: "owner_forward" | "admin_approve" | "owner_reject" | "admin_reject" | "resubmit" | "status_override" = "status_override";
  if (!canStatusEditAtAnyStage || nextAllowed.includes(newState)) {
    if (currentState === "SUBMITTED" && newState === "UNDER_REVIEW") reviewAction = "owner_forward";
    else if (currentState === "UNDER_REVIEW" && newState === "APPROVED") reviewAction = "admin_approve";
    else if (currentState === "SUBMITTED" && (newState === "CLARIFICATION" || newState === "REJECTED")) reviewAction = "owner_reject";
    else if (currentState === "UNDER_REVIEW" && (newState === "CLARIFICATION" || newState === "REJECTED")) reviewAction = "admin_reject";
    else if (currentState === "CLARIFICATION" && newState === "RESUBMITTED") reviewAction = "resubmit";
  }

  // Record Review Event
  if (["owner_forward", "admin_approve", "owner_reject", "admin_reject", "resubmit"].includes(reviewAction) || canStatusEditAtAnyStage) {
    const mappedLegacyStatus = toCanonicalReviewState(newState);
    await recordDocumentReviewEvent({
        documentId,
        projectId: document.project_id,
        reviewerId: userId,
        reviewerRole: actorRole,
        action: reviewAction,
        statusAfter: mappedLegacyStatus,
        remarks: remarks,
    });
  }

  // Log Activity
  const summary = `Document workflow state moved from ${currentState} to ${newState}.`;
  await logDocumentActivity(writer, {
    documentId,
    projectId: document.project_id,
    action: "status_updated",
    actorId: userId,
    actorRole,
    summary,
      details: {
        from_state: currentState,
        to_state: newState,
        remarks: remarks || null,
        is_override: isOverride,
        override_reason: normalizedOverrideReason,
      },
  });

  // Notifications
  if (newState === "UNDER_REVIEW") {
    const admins = await getProjectMembersByRoles(writer, document.project_id, ["project_admin", "super_admin", "super_user"]);
    await notifyUsers(writer, {
      projectId: document.project_id,
      creditId: document.credit_id,
      documentId,
      userIds: admins,
      body: `A document (${document.file_name}) is ready for Project Admin review.`,
      actionUrl: `/review-queue?project=${document.project_id}&document=${documentId}`,
    });
  } else if (newState === "SUBMITTED") {
    const owners = await getProjectMembersByRoles(writer, document.project_id, ["owner"]);
    await notifyUsers(writer, {
      projectId: document.project_id,
      creditId: document.credit_id,
      documentId,
      userIds: owners,
      body: `A document (${document.file_name}) is awaiting Project Owner review.`,
      actionUrl: `/review-queue?project=${document.project_id}&document=${documentId}`,
    });
  } else if (newState === "CLARIFICATION" || newState === "REJECTED") {
    const { data: docData } = await writer.from("project_document").select("uploaded_by").eq("id", documentId).maybeSingle();
    if (docData?.uploaded_by) {
        await notifyUsers(writer, {
            projectId: document.project_id,
            creditId: document.credit_id,
            documentId,
            userIds: [docData.uploaded_by],
            body: `Document (${document.file_name}) was sent back for clarification: ${remarks || "No reason provided."}`,
            actionUrl: `/documents?project=${document.project_id}&document=${documentId}`,
        });
    }
    // Insert into remarks table for UI display
    if (remarks && document.credit_id) {
        await writer.from("remarks").insert({
            credit_id: document.credit_id,
            document_id: documentId,
            author_id: userId,
            role: actorRole,
            body: remarks,
        });
    }
  } else if (newState === "APPROVED") {
    const { data: docData } = await writer.from("project_document").select("uploaded_by").eq("id", documentId).maybeSingle();
    if (docData?.uploaded_by) {
        await notifyUsers(writer, {
            projectId: document.project_id,
            creditId: document.credit_id,
            documentId,
            userIds: [docData.uploaded_by],
            body: `Your document (${document.file_name}) has been approved.`,
            actionUrl: `/documents?project=${document.project_id}&document=${documentId}`,
        });
    }
  } else if (newState === "RESUBMITTED") {
    const owners = await getProjectMembersByRoles(writer, document.project_id, ["owner"]);
    await notifyUsers(writer, {
      projectId: document.project_id,
      creditId: document.credit_id,
      documentId,
      userIds: owners,
      body: `A corrected document (${document.file_name}) was resubmitted and needs owner review.`,
      actionUrl: `/review-queue?project=${document.project_id}&document=${documentId}`,
    });
  }

  eventBus.emit({
    type: "REVIEW_COMPLETED",
    payload: {
      documentId,
      projectId: document.project_id,
      status: newState,
      userId: userId || "",
    },
  });

  return {
    ok: true as const,
    fromState: currentState,
    toState: newState,
    projectId: document.project_id,
    creditId: document.credit_id,
  };
}
