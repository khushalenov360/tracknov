import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canEditDocumentStatusAtAnyStage } from "@/lib/rbac";
import { eventBus } from "@/lib/events/event-bus";
import { notifyUsers, getProjectMembersByRoles } from "./notification-service";
import { logDocumentActivity } from "./activity-service";
import { taskService } from "./task-service";
import { runtimeGovernanceService } from "./runtime-governance-service";

type SupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>;

export type CanonicalReviewState =
  | "uploaded"
  | "owner_review"
  | "admin_review"
  | "approved"
  | "rejected";

export type WorkflowState =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "MAPPED"
  | "L1_REVIEW"
  | "L1_REJECTED"
  | "READY_FOR_L3"
  | "UNDER_L3_REVIEW"
  | "CLARIFICATION"
  | "APPROVED"
  | "REJECTED"
  | "REVOKED";

export function toCanonicalReviewState(state: WorkflowState): CanonicalReviewState {
  switch (state) {
    case "ASSIGNED":
    case "IN_PROGRESS":
    case "MAPPED":
      return "uploaded";
    case "L1_REVIEW":
      return "owner_review";
    case "READY_FOR_L3":
    case "UNDER_L3_REVIEW":
    case "CLARIFICATION":
      return "admin_review";
    case "APPROVED":
      return "approved";
    case "REJECTED":
    case "L1_REJECTED":
    case "REVOKED":
      return "rejected";
    default:
      return "uploaded";
  }
}

export function fromCanonicalReviewState(state: CanonicalReviewState): WorkflowState {
  switch (state) {
    case "uploaded":
      return "IN_PROGRESS";
    case "owner_review":
      return "L1_REVIEW";
    case "admin_review":
      return "UNDER_L3_REVIEW";
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    default:
      return "IN_PROGRESS";
  }
}

const allowedTransitions: Record<WorkflowState, WorkflowState[]> = {
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["MAPPED"],
  MAPPED: ["L1_REVIEW"],
  L1_REVIEW: ["READY_FOR_L3", "L1_REJECTED", "REJECTED"],
  L1_REJECTED: ["IN_PROGRESS"],
  READY_FOR_L3: ["UNDER_L3_REVIEW"],
  UNDER_L3_REVIEW: ["APPROVED", "CLARIFICATION", "REJECTED"],
  CLARIFICATION: ["IN_PROGRESS"],
  APPROVED: ["REVOKED"],
  REJECTED: ["IN_PROGRESS"],
  REVOKED: ["ASSIGNED"],
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

async function getAssignedOwnerForCredit(writer: SupabaseClient, projectCreditId: string) {
  const { data } = await writer
    .from("project_credits")
    .select("assigned_user_id")
    .eq("id", projectCreditId)
    .maybeSingle();
  const assignedUserId = (data as any)?.assigned_user_id as string | null;
  return assignedUserId ?? null;
}

async function executeValidationGate(writer: SupabaseClient, submittalId: string, userId?: string | null) {
  const started = Date.now();
  const { data, error } = await writer.rpc("validate_submittal", {
    p_submittal_id: submittalId,
    p_actor_id: userId ?? null,
  });
  if (error) {
    if (String(error.message ?? "").toLowerCase().includes("validate_submittal")) {
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }
  const payload = (data ?? {}) as { ok?: boolean; message?: string };
  if (payload.ok === false) {
    return { ok: false, error: payload.message ?? "Validation gate blocked this transition." };
  }
  void runtimeGovernanceService.recordMetric({
    metricName: "validation_latency_ms",
    metricValue: Date.now() - started,
    ok: true,
    details: { submittalId },
  });
  if (Date.now() - started > 2000) {
    void runtimeGovernanceService.raiseAlert({
      alertType: "validation_latency_slo_breach",
      severity: "warning",
      message: "Validation latency exceeded 2 second target.",
      context: { submittalId, latencyMs: Date.now() - started },
    });
  }
  return { ok: true };
}

async function recordDocumentReviewEventDirect(
  writer: SupabaseClient,
  input: {
    documentId: string;
    projectId: string;
    reviewerId?: string | null;
    reviewerRole?: string | null;
    action: "owner_forward" | "admin_approve" | "owner_reject" | "admin_reject" | "resubmit" | "status_override";
    statusAfter: string;
    remarks?: string | null;
    versionNumber?: number | null;
  },
) {
  await writer.from("document_reviews").insert({
    document_id: input.documentId,
    project_id: input.projectId,
    reviewer_id: input.reviewerId ?? null,
    reviewer_role: input.reviewerRole ?? null,
    action: input.action,
    status_after: input.statusAfter,
    remarks: input.remarks ?? null,
    version_number: input.versionNumber ?? null,
  });
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
    idempotencyKey?: string | null;
    override?: boolean;
    overrideReason?: string | null;
  },
) {
  const transitionStarted = Date.now();
  const { data: document } = await writer
    .from("project_document")
    .select("id, project_id, project_credit_id, credit_id, submittal_id, state, file_name, rejection_reason, rejection_count, version")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) {
    await runtimeGovernanceService.recordMetric({
      metricName: "transition_latency_ms",
      metricValue: Date.now() - transitionStarted,
      ok: false,
      details: { documentId, reason: "document_not_found" },
    });
    return { ok: false as const, error: "Document not found." };
  }

  const currentState = (document.state ?? "DRAFT") as WorkflowState;
  if (currentState === newState) {
    return {
      ok: true as const,
      fromState: currentState,
      toState: newState,
      projectId: document.project_id,
      creditId: document.credit_id,
    };
  }
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
    await runtimeGovernanceService.raiseAlert({
      projectId: document.project_id,
      alertType: "workflow_bypass_attempt",
      severity: "critical",
      message: `Invalid transition blocked: ${currentState} -> ${newState}`,
      context: { documentId, actorRole },
    });
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
  const l0Roles = ["consultant", "architect", "mep", "contractor"];
  const l1Roles = ["owner"];
  const l3Roles = ["project_admin", "super_admin"];
  const l5Roles = ["super_user"];


  if (!isOverride && l0Roles.includes(role) && !["IN_PROGRESS", "MAPPED"].includes(newState)) {
    return { ok: false as const, error: "L0 role is restricted to upload and mapping transitions only." };
  }
  if (!isOverride && l1Roles.includes(role) && !["L1_REVIEW", "READY_FOR_L3", "L1_REJECTED", "REJECTED"].includes(newState)) {
    return { ok: false as const, error: "L1 role can only perform owner-stage review actions." };
  }
  if (!isOverride && ["APPROVED", "REJECTED", "CLARIFICATION"].includes(newState) && !(l3Roles.includes(role) || l5Roles.includes(role))) {
    if (newState === "APPROVED") {
        await runtimeGovernanceService.raiseAlert({
          projectId: document.project_id,
          alertType: "authorization_failure",
          severity: "warning",
          message: "Unauthorized approval attempt blocked.",
          context: { documentId, actorRole, targetState: newState },
        });
        return { ok: false as const, error: "Only L3 roles can approve documents." };
    }
  }

  if (!isOverride && newState === "APPROVED" && !remarks) {
    return { ok: false as const, error: "Approval requires mandatory comments for audit attribution." };
  }

  if (!isOverride && newState === "L1_REVIEW" && !(l1Roles.includes(role) || l5Roles.includes(role))) {
    return { ok: false as const, error: "Only L1 or L5 can move document into owner review." };
  }
  if (!isOverride && newState === "UNDER_L3_REVIEW" && !(l3Roles.includes(role) || l5Roles.includes(role))) {
    return { ok: false as const, error: "Only L3 or L5 can move document into admin review." };
  }

  // Business rules
  if (currentState === "ASSIGNED" && newState === "IN_PROGRESS") {
    // Initial upload or assignment acceptance logic here if needed
  }

  if (currentState === "IN_PROGRESS" && newState === "MAPPED") {
    const ready = await hasAllRequiredDocsForCredit(writer, document.project_credit_id);
    if (!ready) {
      return { ok: false as const, error: "Cannot mark MAPPED until all required document types exist for this credit." };
    }
  }

  if (currentState === "MAPPED" && newState === "L1_REVIEW" && !manualSubmit) {
    return { ok: false as const, error: "MAPPED to L1_REVIEW requires manual trigger." };
  }

  if (currentState === "L1_REVIEW" && newState === "READY_FOR_L3") {
    const hasReviewer = await hasReviewerAssigned(writer, document.project_id);
    if (!hasReviewer) {
      return { ok: false as const, error: "Cannot move to READY_FOR_L3 without admin reviewer assignment." };
    }
  }

  if ((currentState === "MAPPED" && newState === "L1_REVIEW") || (currentState === "READY_FOR_L3" && newState === "UNDER_L3_REVIEW")) {
    if (document.submittal_id) {
      const validationGate = await executeValidationGate(writer, document.submittal_id, userId ?? null);
      if (!validationGate.ok) {
        return { ok: false as const, error: validationGate.error };
      }
    }
  }

  if (currentState === "CLARIFICATION" && newState === "RESUBMITTED" && !updatedEvidence) {
    return { ok: false as const, error: "Cannot resubmit without updated evidence." };
  }

  // 2. Execute Atomic Transaction via RPC (Section 4: Atomic Governance Transactions)
  const { data: rpcData, error: rpcError } = await writer.rpc("execute_governed_transition", {
    p_entity_type: "document",
    p_entity_id: documentId,
    p_target_state: newState,
    p_actor_id: userId ?? null,
    p_actor_role: actorRole,
    p_reason: remarks || overrideReason || "Status update",
    p_idempotency_key: idempotencyKey || `doc-${documentId}-${Date.now()}`,
    p_metadata: {
      is_override: isOverride,
      override_reason: normalizedOverrideReason,
      manual_submit: manualSubmit,
      updated_evidence: updatedEvidence
    }
  });

  if (rpcError) {
    return { ok: false as const, error: rpcError.message };
  }

  const result = rpcData as { success: boolean; from: WorkflowState; to: WorkflowState; idempotent?: boolean };
  
  if (!result.success) {
    return { ok: false as const, error: "Atomic transition failed." };
  }

  const resolvedTargetState = result.to;
  const fromState = result.from;

  // 3. Side Effects (Notifications, Scoring, Metrics) - Non-Atomic but Eventual
  
  // Notifications (Async/Background)
  if (resolvedTargetState === "UNDER_L3_REVIEW") {
    const admins = await getProjectMembersByRoles(writer, document.project_id, ["project_admin", "super_admin", "super_user"]);
    void notifyUsers(writer, {
      projectId: document.project_id,
      creditId: document.credit_id,
      documentId,
      userIds: admins,
      body: `A document (${document.file_name}) is ready for Project Admin review.`,
      actionUrl: `/review-queue?project=${document.project_id}&document=${documentId}`,
    });
  } else if (resolvedTargetState === "L1_REVIEW") {
    const owners = await getProjectMembersByRoles(writer, document.project_id, ["owner"]);
    void notifyUsers(writer, {
      projectId: document.project_id,
      creditId: document.credit_id,
      documentId,
      userIds: owners,
      body: `A document (${document.file_name}) is awaiting Project Owner review.`,
      actionUrl: `/review-queue?project=${document.project_id}&document=${documentId}`,
    });
  } else if (["CLARIFICATION", "REJECTED", "L1_REJECTED"].includes(resolvedTargetState)) {
    const assignedOwnerId = await getAssignedOwnerForCredit(writer, document.project_credit_id);
    const { data: docData } = await writer.from("project_document").select("uploaded_by").eq("id", documentId).maybeSingle();
    const targetUserId = assignedOwnerId || docData?.uploaded_by || null;
    if (targetUserId) {
        void notifyUsers(writer, {
            projectId: document.project_id,
            creditId: document.credit_id,
            documentId,
            userIds: [targetUserId],
            body: `Document (${document.file_name}) was sent back for clarification: ${remarks || "No reason provided."}`,
            actionUrl: `/documents?project=${document.project_id}&document=${documentId}`,
        });
        void taskService.upsertClarificationTask({
          projectId: document.project_id,
          documentId,
          assignedUserId: targetUserId,
          createdBy: userId ?? null,
          title: `Fix and resubmit ${document.file_name}`,
          description: remarks || "Document needs clarification before approval.",
        });
    }
  } else if (resolvedTargetState === "APPROVED") {
    const { data: docData } = await writer.from("project_document").select("uploaded_by").eq("id", documentId).maybeSingle();
    if (docData?.uploaded_by) {
        void notifyUsers(writer, {
            projectId: document.project_id,
            creditId: document.credit_id,
            documentId,
            userIds: [docData.uploaded_by],
            body: `Your document (${document.file_name}) has been approved.`,
            actionUrl: `/documents?project=${document.project_id}&document=${documentId}`,
        });
    }
  }

  // Scoring update (Async)
  if (document.project_id) {
    void writer.rpc("recompute_credit_scores", { p_project_id: document.project_id }).catch(console.error);
  }

  eventBus.emit({
    type: "REVIEW_COMPLETED",
    payload: {
      documentId,
      projectId: document.project_id,
      status: resolvedTargetState,
      userId: userId || "",
    },
  });

  const transitionLatency = Date.now() - transitionStarted;
  void runtimeGovernanceService.recordMetric({
    projectId: document.project_id ?? null,
    metricName: "transition_latency_ms",
    metricValue: transitionLatency,
    ok: true,
    details: { documentId, fromState, toState: resolvedTargetState, idempotent: result.idempotent },
  });

  return {
    ok: true as const,
    fromState,
    toState: resolvedTargetState,
    projectId: document.project_id,
    creditId: document.credit_id,
  };
}
