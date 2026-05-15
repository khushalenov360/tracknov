import type { CurrentUser } from "@/lib/types";
import { workflowOrchestratorService } from "@/lib/services/workflow-orchestrator-service";
import type { WorkflowState } from "@/lib/services/document-state-service";
import { recomputeDerivedState } from "@/core/runtime/derivedStateEngine";
import { governanceLocalStorage } from "@/lib/governance/governanceContext";
import crypto from "node:crypto";

export type RuntimeTransitionRequest = {
  entityType: "document" | "submittal" | "project";
  entityId: string;
  targetState: string;
  projectId?: string | null;
  action?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  override?: boolean;
  overrideReason?: string | null;
};

/**
 * AUTHORITATIVE RUNTIME ORCHESTRATOR
 * 
 * Implements Section 33 Universal Orchestration rules.
 * Strictly enforces Layer Precedence:
 * L5 (Governance/Audit) -> L4 (Derived State) -> L3 (Workflow) -> L2 (AuthZ) -> L1 (Identity)
 */
export async function runRuntimeTransition(
  user: CurrentUser | null,
  request: RuntimeTransitionRequest,
) {
  const started = Date.now();
  
  // Enforce Section 33: entityId and entityType are mandatory
  if (!request.entityId || !request.entityType) {
    return {
      ok: false,
      status: "invalid_payload",
      message: "Universal Orchestration Enforcement: entityId and entityType are mandatory.",
    };
  }

  // Wrap in Governance Context for Forensic Traceability (Section 10)
  const traceId = (request.metadata?.traceId as string) || crypto.randomUUID();
  const causalityChainId = (request.metadata?.causalityChainId as string) || crypto.randomUUID();

  return governanceLocalStorage.run({
    projectId: request.projectId || "SYSTEM",
    actorId: user?.id,
    replayMode: false,
    traceId,
    causalityChainId,
  }, async () => {
    // 1. Execute Primary Workflow Mutation (L3)
    const transitionResult = await workflowOrchestratorService.transition(user, request);
    if (!transitionResult.ok) {
      return transitionResult;
    }

    // 2. Trigger Automated Derived State Reconciliation (L4 - Section 9)
    const projectId = transitionResult.derived_state_summary?.project_id;
    if (projectId) {
      try {
        await recomputeDerivedState(projectId);
      } catch (err) {
        // Log but don't fail the primary transition
        console.error("[ORCHESTRATOR_L4_FAILURE] Derived state recomputation failed:", err);
      }
    }

    return transitionResult;
  });
}
