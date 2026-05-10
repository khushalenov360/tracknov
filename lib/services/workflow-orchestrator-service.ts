import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { canEditDocumentStatusAtAnyStage, isL5Role } from "@/lib/rbac";
import type { CurrentUser, MemberRole } from "@/lib/types";
import { transitionDocumentState, type WorkflowState } from "@/lib/services/document-state-service";
import { runtimeGovernanceService } from "@/lib/services/runtime-governance-service";
import { workflowAllowedActions } from "@/lib/workflow/state-renderer";

type WorkflowEntityType = "document" | "submittal";

export type WorkflowTransitionRequest = {
  entityType: WorkflowEntityType;
  entityId: string;
  projectId?: string | null;
  targetState: WorkflowState;
  action?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
  override?: boolean;
  overrideReason?: string | null;
};

export type SubmittalTransitionRequest = {
  projectId: string;
  submittalId: string;
  targetState: WorkflowState;
  reason?: string | null;
  override?: boolean;
};

export type AssignmentRequest = {
  projectId: string;
  projectCreditId: string;
  assignedUserId: string | null;
  documentType: string | null;
  reason?: string | null;
  override?: boolean;
};

export type WorkflowTransitionSuccess = {
  ok: true;
  workflow_state: WorkflowState;
  allowed_actions: string[];
  lock_state: {
    locked: boolean;
    reason: string | null;
  };
  validation_status: "passed";
  audit_reference: string | null;
  derived_state_summary: {
    project_id: string | null;
    entity_type: WorkflowEntityType;
    entity_id: string;
    from_state: string | null;
    to_state: string;
  };
};

export type WorkflowTransitionFailure = {
  ok: false;
  status:
    | "authentication_failed"
    | "authorization_failed"
    | "validation_failed"
    | "workflow_failed"
    | "lock_violation"
    | "not_found"
    | "conflict";
  message: string;
  allowed_actions: string[];
  lock_state: {
    locked: boolean;
    reason: string | null;
  };
};

export type AssignmentResult = {
  ok: boolean;
  message?: string;
  status?: "unauthorized" | "validation_failed" | "error";
};

export type WorkflowTransitionResult = WorkflowTransitionSuccess | WorkflowTransitionFailure;

export class WorkflowOrchestratorService {
  private get reader() {
    return createClient();
  }

  private get writer() {
    return env.supabaseServiceRoleKey ? createAdminClient() : this.reader;
  }

  private failure(
    status: WorkflowTransitionFailure["status"],
    message: string,
    lockState: WorkflowTransitionFailure["lock_state"] = { locked: false, reason: null },
    allowedActions: string[] = [],
  ): WorkflowTransitionFailure {
    return {
      ok: false,
      status,
      message,
      allowed_actions: allowedActions,
      lock_state: lockState,
    };
  }

  private async getProjectRole(projectId: string, user: CurrentUser): Promise<MemberRole | null> {
    if (user.role === "super_user") return "super_user";

    const { data } = await this.reader
      .from("project_users")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    return ((data?.role ?? user.role) as MemberRole | null) ?? null;
  }

  private async getDocumentEnvelope(documentId: string) {
    const { data, error } = await this.reader
      .from("project_document")
      .select("id, project_id, project_credit_id, submittal_id, state")
      .eq("id", documentId)
      .maybeSingle();

    if (error) throw error;
    return data as {
      id: string;
      project_id: string;
      project_credit_id: string | null;
      submittal_id: string | null;
      state: WorkflowState | null;
    } | null;
  }

  private async getProjectLockState(projectId: string) {
    const { data } = await this.reader
      .from("projects")
      .select("certification_state, certification_block_reason")
      .eq("id", projectId)
      .maybeSingle();

    const certificationState = String((data as any)?.certification_state ?? "");
    const locked = certificationState === "CERTIFIED_LOCKED";
    return {
      locked,
      reason: locked
        ? ((data as any)?.certification_block_reason ?? "Project is certified and locked.")
        : null,
    };
  }

  private async logSecurityEvent(params: {
    projectId?: string | null;
    userId?: string | null;
    eventType: string;
    severity?: "info" | "warning" | "critical";
    details?: Record<string, unknown>;
  }) {
    try {
      await this.writer.from("security_events").insert({
        project_id: params.projectId ?? null,
        actor_id: params.userId ?? null,
        event_type: params.eventType,
        severity: params.severity ?? "warning",
        details: params.details ?? {},
      });
    } catch {
      await runtimeGovernanceService.raiseAlert({
        projectId: params.projectId ?? null,
        alertType: "security_event_log_failure",
        severity: "warning",
        message: "Security event logging failed.",
        context: params.details ?? {},
      });
    }
  }

  private async setRuntimeContext(role: string, userId: string | null, override: boolean) {
    await this.writer.rpc("set_runtime_context", {
      p_user_role: role,
      p_user_id: userId,
      p_override: override,
    });
  }

  async transition(user: CurrentUser | null, request: WorkflowTransitionRequest): Promise<WorkflowTransitionResult> {
    const started = Date.now();

    if (!user) {
      return this.failure("authentication_failed", "Authentication required.");
    }

    if (request.entityType !== "document") {
      return this.failure(
        "workflow_failed",
        "Only document workflow transitions are currently available through the orchestrator.",
      );
    }

    const document = await this.getDocumentEnvelope(request.entityId);
    if (!document) {
      return this.failure("not_found", "Workflow entity not found.");
    }

    const projectId = request.projectId ?? document.project_id;
    const currentState = (document.state ?? "DRAFT") as WorkflowState;
    const allowedActions = workflowAllowedActions(currentState);
    const lockState = await this.getProjectLockState(projectId);
    const actorRole = await this.getProjectRole(projectId, user);

    if (!actorRole) {
      await this.logSecurityEvent({
        projectId,
        userId: user.id,
        eventType: "workflow_membership_denied",
        details: { entityId: request.entityId },
      });
      return this.failure("authorization_failed", "Project membership is required.", lockState, allowedActions);
    }

    const override = Boolean(request.override);
    if (lockState.locked && !(override && isL5Role(actorRole))) {
      await this.logSecurityEvent({
        projectId,
        userId: user.id,
        eventType: "certified_lock_violation",
        severity: "critical",
        details: { entityId: request.entityId, targetState: request.targetState, actorRole },
      });
      return this.failure("lock_violation", lockState.reason ?? "Project is locked.", lockState, allowedActions);
    }

    // SECTION 3: Role-Based Execution Restrictions
    const isL0 = actorRole === "contributor";
    const isL1 = actorRole === "owner";
    const isL3 = actorRole === "project_admin" || actorRole === "super_admin" || actorRole === "super_user";

    // L0 Restrictions: No approval, no validation, only upload/mapped transitions
    if (isL0 && !["IN_PROGRESS", "MAPPED"].includes(request.targetState)) {
      return this.failure("authorization_failed", "L0 Contributor is restricted to upload and mapping transitions only.", lockState, allowedActions);
    }

    // L1 Restrictions: No final validation authority (APPROVED/REJECTED/CLARIFICATION)
    if (isL1 && ["APPROVED", "REJECTED", "CLARIFICATION"].includes(request.targetState)) {
      return this.failure("authorization_failed", "L1 Project Owner cannot perform final validation actions.", lockState, allowedActions);
    }

    // L3 Requirements: Validation authority
    if (["APPROVED", "REJECTED", "CLARIFICATION"].includes(request.targetState) && !isL3 && !override) {
      return this.failure("authorization_failed", "Only L3 Project Admin can perform validation actions.", lockState, allowedActions);
    }

    // SECTION 13: Approval without comments = BLOCKED
    if (request.targetState === "APPROVED" && !request.reason?.trim() && !override) {
      return this.failure("validation_failed", "Approval requires mandatory comments.", lockState, allowedActions);
    }

    if (override && !isL5Role(actorRole)) {
      await this.logSecurityEvent({
        projectId,
        userId: user.id,
        eventType: "override_denied",
        severity: "critical",
        details: { entityId: request.entityId, actorRole },
      });
      return this.failure("authorization_failed", "Only L5 Super User can override workflow governance.", lockState, allowedActions);
    }

    if (override && !request.overrideReason?.trim()) {
      return this.failure("validation_failed", "Override reason is mandatory.", lockState, allowedActions);
    }

    await this.setRuntimeContext(actorRole, user.id, override);

    const transition = await transitionDocumentState(this.writer, {
      documentId: request.entityId,
      newState: request.targetState,
      userId: user.id,
      actorRole,
      manualSubmit: Boolean(request.metadata?.manualSubmit ?? request.action === "submit"),
      updatedEvidence: Boolean(request.metadata?.updatedEvidence),
      remarks: request.reason ?? null,
      idempotencyKey: request.idempotencyKey ?? null,
      override,
      overrideReason: request.overrideReason ?? null,
    });

    if (!transition.ok) {
      const transitionError = transition.error ?? "Workflow transition failed.";
      await this.logSecurityEvent({
        projectId,
        userId: user.id,
        eventType: transitionError.toLowerCase().includes("concurrent") ? "stale_mutation_attempt" : "workflow_transition_denied",
        details: {
          entityId: request.entityId,
          fromState: currentState,
          targetState: request.targetState,
          error: transitionError,
        },
      });
      return this.failure(
        transitionError.toLowerCase().includes("concurrent") ? "conflict" : "validation_failed",
        transitionError,
        lockState,
        allowedActions,
      );
    }

    const toState = transition.toState as WorkflowState;
    const response: WorkflowTransitionSuccess = {
      ok: true,
      workflow_state: toState,
      allowed_actions: workflowAllowedActions(toState),
      lock_state: lockState,
      validation_status: "passed",
      audit_reference: null,
      derived_state_summary: {
        project_id: projectId,
        entity_type: request.entityType,
        entity_id: request.entityId,
        from_state: transition.fromState ?? currentState,
        to_state: toState,
      },
    };

    await runtimeGovernanceService.recordMetric({
      projectId,
      metricName: "orchestrator_transition_latency_ms",
      metricValue: Date.now() - started,
      ok: true,
      details: {
        entityType: request.entityType,
        entityId: request.entityId,
        targetState: request.targetState,
      },
    });

    return response;
  }

  async assignContributor(user: CurrentUser | null, request: AssignmentRequest): Promise<AssignmentResult> {
    const started = Date.now();

    if (!user) {
      return { ok: false, status: "unauthorized", message: "Authentication required." };
    }

    const { projectId, projectCreditId, assignedUserId, documentType, reason, override } = request;
    const actorRole = await this.getProjectRole(projectId, user);

    if (!actorRole) {
      await this.logSecurityEvent({
        projectId,
        userId: user.id,
        eventType: "assignment_membership_denied",
        details: { projectCreditId },
      });
      return { ok: false, status: "unauthorized", message: "Project membership is required." };
    }

    // Role validation (L3 or Owner required for assignment)
    const isL3 = actorRole === "project_admin" || actorRole === "super_admin" || actorRole === "super_user";
    const isOwner = actorRole === "owner";

    if (!isL3 && !isOwner && !override) {
      return { ok: false, status: "unauthorized", message: "Only Project Admin or Owner can manage assignments." };
    }

    const lockState = await this.getProjectLockState(projectId);
    if (lockState.locked && !override) {
      return { ok: false, status: "validation_failed", message: lockState.reason ?? "Project is locked." };
    }

    try {
      // Set DB context for trigger-level RBAC and audit
      await this.setRuntimeContext(actorRole, user.id, Boolean(override));

      // Import service late to avoid circular dependency
      const { creditService } = await import("./credit-service");
      
      await creditService.assignContributor(user, {
        projectId,
        projectCreditId,
        assignedUserId,
        documentType,
        reason: reason || null,
      }, this.writer);

      await runtimeGovernanceService.recordMetric({
        projectId,
        metricName: "assignment_latency_ms",
        metricValue: Date.now() - started,
        ok: true,
        details: { projectCreditId, assignedUserId },
      });

      return { ok: true };
    } catch (error: any) {
      console.error("[WorkflowOrchestratorService.assignContributor] Error:", error);
      return { ok: false, status: "error", message: error.message || "Assignment failed." };
    }
  }

  async transitionSubmittal(user: CurrentUser | null, request: SubmittalTransitionRequest): Promise<WorkflowTransitionResult> {
    const started = Date.now();

    if (!user) {
      return this.failure("authentication_failed", "Authentication required.");
    }

    const { projectId, submittalId, targetState, reason, override } = request;
    const actorRole = await this.getProjectRole(projectId, user);
    const lockState = await this.getProjectLockState(projectId);

    if (!actorRole) {
      return this.failure("authorization_failed", "Project membership is required.", lockState);
    }

    // Role validation (L3 required for submittal transition to APPROVED)
    if (targetState === "APPROVED" && actorRole !== "project_admin" && actorRole !== "super_admin" && actorRole !== "super_user" && !override) {
      return this.failure("authorization_failed", "Only Project Admin can approve submittals.", lockState);
    }

    if (lockState.locked && !(override && isL5Role(actorRole))) {
      return this.failure("lock_violation", lockState.reason ?? "Project is locked.", lockState);
    }

    try {
      await this.setRuntimeContext(actorRole, user.id, Boolean(override));

      const { submittalService } = await import("./submittal-service");

      if (targetState === "APPROVED") {
        const gate = await submittalService.validateSubmittalGate(submittalId);
        if (!gate.ok && !override) {
          return this.failure("validation_failed", gate.message ?? "Validation failed.", lockState);
        }
      }

      const idempotencyKey = `submittal-${submittalId}-${targetState}-${Date.now()}`;
      const { data: rpcData, error: rpcError } = await this.writer.rpc("execute_governed_transition", {
        p_entity_type: "submittal",
        p_entity_id: submittalId,
        p_target_state: targetState,
        p_actor_id: user.id,
        p_actor_role: actorRole,
        p_reason: reason ?? "Submittal transition",
        p_idempotency_key: idempotencyKey,
        p_metadata: {
          override: Boolean(override),
        },
      });
      if (rpcError) throw rpcError;
      const transition = (rpcData ?? {}) as { success?: boolean; from?: string; to?: string };
      if (!transition.success) {
        return this.failure("workflow_failed", "Submittal transition failed.", lockState);
      }

      await submittalService.recalculateSubmittalState(submittalId, this.writer);

      await runtimeGovernanceService.recordMetric({
        projectId,
        metricName: "submittal_transition_latency_ms",
        metricValue: Date.now() - started,
        ok: true,
        details: { submittalId, targetState },
      });

      return {
        ok: true,
        workflow_state: targetState,
        allowed_actions: workflowAllowedActions(targetState),
        lock_state: lockState,
        validation_status: "passed",
        audit_reference: idempotencyKey,
        derived_state_summary: {
          project_id: projectId,
          entity_type: "submittal",
          entity_id: submittalId,
          from_state: (transition.from ?? null) as string | null,
          to_state: (transition.to ?? targetState) as string,
        },
      };
    } catch (error: any) {
      console.error("[WorkflowOrchestratorService.transitionSubmittal] Error:", error);
      return this.failure("workflow_failed", error.message || "Submittal transition failed.", lockState);
    }
  }
}

export const workflowOrchestratorService = new WorkflowOrchestratorService();
