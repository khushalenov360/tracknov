import type { CurrentUser } from "@/lib/types";
import { workflowOrchestratorService } from "@/lib/services/workflow-orchestrator-service";
import type { WorkflowState } from "@/lib/services/document-state-service";
import { recomputeDerivedState } from "@/core/runtime/derivedStateEngine";

export type RuntimeTransitionRequest = {
  entityType: "document" | "submittal";
  entityId: string;
  targetState: WorkflowState;
  projectId?: string | null;
  action?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  override?: boolean;
  overrideReason?: string | null;
};

/**
 * Central runtime orchestrator entrypoint.
 * Pipeline:
 * API -> Orchestrator -> Validation/RBAC/Audit (service) -> Derived State Engine -> Commit response
 */
export async function runRuntimeTransition(
  user: CurrentUser | null,
  request: RuntimeTransitionRequest,
) {
  const transitionResult = await workflowOrchestratorService.transition(user, request);
  if (!transitionResult.ok) {
    return transitionResult;
  }

  const projectId = transitionResult.derived_state_summary.project_id;
  if (projectId) {
    // Best-effort derived recalculation hardening; transition has already been governed.
    try {
      await recomputeDerivedState(projectId);
    } catch {
      // Intentionally swallow to avoid making orchestrated transition non-deterministic
      // in environments where derived-state RPCs are not yet present.
    }
  }

  return transitionResult;
}
