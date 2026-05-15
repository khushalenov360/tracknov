import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { canUser, getRoleLevel, isL5Role } from "@/lib/rbac";
import type { CurrentUser, MemberRole } from "@/lib/types";
import { runtimeGovernanceService } from "@/lib/services/runtime-governance-service";
import { workflowAllowedActions } from "@/lib/workflow/state-renderer";
import { 
  SubmittalWorkflowMachine, 
  ProjectCertificationMachine, 
  mapTracknovRoleToWorkflowRole 
} from "@/lib/workflow/machines";
import type { SubmittalWorkflowState, ProjectCertificationState } from "@/lib/workflow/types";

type WorkflowEntityType = "document" | "submittal" | "project";

export type WorkflowTransitionRequest = {
  entityType: WorkflowEntityType;
  entityId: string;
  projectId?: string | null;
  targetState: string;
  action?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
  override?: boolean;
  overrideReason?: string | null;
};

export type WorkflowTransitionResult = {
  ok: boolean;
  status?: string;
  message?: string;
  workflow_state?: string;
  allowed_actions?: string[];
  lock_state?: {
    locked: boolean;
    reason: string | null;
  };
  validation_status?: string;
  audit_reference?: string | null;
  derived_state_summary?: {
    project_id: string | null;
    entity_type: string;
    entity_id: string;
    from_state: string | null;
    to_state: string;
  };
};

export class WorkflowOrchestratorService {
  private get reader() {
    return createClient();
  }

  private get writer() {
    return env.supabaseServiceRoleKey ? createAdminClient() : this.reader;
  }

  private failure(
    status: string,
    message: string,
    lockState: { locked: boolean; reason: string | null } = { locked: false, reason: null },
    allowedActions: string[] = [],
  ): any {
    return {
      ok: false,
      status,
      message,
      allowed_actions: allowedActions,
      lock_state: lockState,
    };
  }

  private async getProjectRole(projectId: string, user: CurrentUser): Promise<MemberRole | null> {
    if (user.role === "L5" || user.role === "super_user") return "L5";

    const { data } = await this.reader
      .from("project_users")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    return (data?.role as MemberRole | null) ?? (user.role as MemberRole | null) ?? null;
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
      // Silent fail
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

    // Resolve Project Context
    let projectId = request.projectId;
    let currentState: string = "DRAFT";

    if (request.entityType === "document" || request.entityType === "submittal") {
      const table = request.entityType === "document" ? "project_document" : "submittals";
      const stateCol = request.entityType === "document" ? "workflow_state" : "state";
      const { data } = await this.reader
        .from(table)
        .select(`id, project_id, ${stateCol}`)
        .eq("id", request.entityId)
        .maybeSingle();
      
      if (!data) return this.failure("not_found", "Entity not found.");
      projectId = projectId ?? data.project_id;
      currentState = (data as any)[stateCol] ?? "DRAFT";
    } else if (request.entityType === "project") {
      const { data } = await this.reader
        .from("projects")
        .select("id, certification_state")
        .eq("id", request.entityId)
        .maybeSingle();
      if (!data) return this.failure("not_found", "Project not found.");
      projectId = data.id;
      currentState = (data as any).certification_state ?? "NOT_STARTED";
    }

    if (!projectId) {
      return this.failure("invalid_payload", "Project context could not be resolved.");
    }

    const lockState = await this.getProjectLockState(projectId);
    const actorRole = await this.getProjectRole(projectId, user);

    if (!actorRole) {
      await this.logSecurityEvent({
        projectId,
        userId: user.id,
        eventType: "workflow_membership_denied",
        details: { entityId: request.entityId },
      });
      return this.failure("authorization_failed", "Project membership is required.", lockState);
    }

    const override = Boolean(request.override);
    if (lockState.locked && !(override && isL5Role(actorRole))) {
      return this.failure("lock_violation", lockState.reason ?? "Project is locked.", lockState);
    }

    // Validate using State Machines
    try {
      const workflowRole = mapTracknovRoleToWorkflowRole(actorRole);
      if (request.entityType === "document" || request.entityType === "submittal") {
        const machine = new SubmittalWorkflowMachine();
        machine.validate(currentState as SubmittalWorkflowState, request.targetState as SubmittalWorkflowState, workflowRole);
      } else if (request.entityType === "project") {
        const machine = new ProjectCertificationMachine();
        machine.validate(currentState as ProjectCertificationState, request.targetState as ProjectCertificationState, workflowRole);
      }
    } catch (err: any) {
      return this.failure("workflow_failed", err.message, lockState);
    }

    // RBAC Engine Check (Section 25)
    // Mapping target state to logical actions for canUser
    let action: any = "UPLOAD";
    if (["APPROVED", "REJECTED", "CLARIFICATION"].includes(request.targetState)) {
      action = "APPROVE";
    }

    if (!canUser(actorRole, action, request.entityType.toUpperCase() as any)) {
      return this.failure("authorization_failed", `Role ${actorRole} is not authorized for this action.`, lockState);
    }

    // Execute Governed Transition via RPC
    await this.setRuntimeContext(actorRole, user.id, override);
    
    const idempotencyKey = request.idempotencyKey ?? `${request.entityType}-${request.entityId}-${request.targetState}-${Date.now()}`;
    
    const { data: rpcData, error: rpcError } = await this.writer.rpc("execute_governed_transition", {
      p_entity_type: request.entityType,
      p_entity_id: request.entityId,
      p_target_state: request.targetState,
      p_actor_id: user.id,
      p_actor_role: actorRole,
      p_reason: request.reason ?? `Transition to ${request.targetState}`,
      p_idempotency_key: idempotencyKey,
      p_metadata: {
        ...request.metadata,
        override,
        overrideReason: request.overrideReason,
      },
    });

    if (rpcError) {
      return this.failure("workflow_failed", rpcError.message, lockState);
    }

    const transition = (rpcData ?? {}) as { success?: boolean; from?: string; to?: string };
    if (!transition.success) {
      return this.failure("workflow_failed", "Transition execution failed in database.", lockState);
    }

    // Post-Transition Logic (Section 9: Derived State)
    if (request.entityType === "submittal") {
      const { submittalService } = await import("./submittal-service");
      await submittalService.recalculateSubmittalState(request.entityId, this.writer);
    }

    const toState = (transition.to ?? request.targetState) as string;
    
    await runtimeGovernanceService.recordMetric({
      projectId,
      metricName: "orchestrator_transition_latency_ms",
      metricValue: Date.now() - started,
      ok: true,
      details: { entityType: request.entityType, entityId: request.entityId, targetState: toState },
    });

    return {
      ok: true,
      workflow_state: toState,
      allowed_actions: workflowAllowedActions(toState),
      lock_state: lockState,
      validation_status: "passed",
      audit_reference: idempotencyKey,
      derived_state_summary: {
        project_id: projectId,
        entity_type: request.entityType,
        entity_id: request.entityId,
        from_state: transition.from ?? currentState,
        to_state: toState,
      },
    };
  }

  // Simplified Assignment (L1/L3 only)
  async assignContributor(user: CurrentUser | null, request: any): Promise<any> {
    if (!user) return { ok: false, message: "Auth required" };
    const actorRole = await this.getProjectRole(request.projectId, user);
    if (!canUser(actorRole, "MANAGE_TEAM", "TEAM")) {
      return { ok: false, message: "Unauthorized" };
    }
    const { creditService } = await import("./credit-service");
    await creditService.assignContributor(user, request, this.writer);
    return { ok: true };
  }
}

export const workflowOrchestratorService = new WorkflowOrchestratorService();
