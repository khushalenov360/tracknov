import type { CurrentUser } from "@/lib/types";
import { workflowOrchestratorService } from "@/lib/services/workflow-orchestrator-service";
import type { WorkflowState } from "@/lib/services/document-state-service";
import { recomputeDerivedState } from "@/core/runtime/derivedStateEngine";
import { governanceLocalStorage } from "@/lib/governance/governanceContext";
import crypto from "node:crypto";

import { executeAction, ExecutionContext, ExecutionResult } from "@/core/runtime/executionContext";

export type RuntimeTransitionRequest = {
  entityType: "document" | "submittal" | "project" | "credit";
  entityId: string;
  targetState: string;
  projectId?: string | null;
  action?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
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
): Promise<ExecutionResult> {
  const started = Date.now();
  
  // Enforce Section 33: entityId and entityType are mandatory
  if (!request.entityId || !request.entityType) {
    return {
      success: false,
      errors: ["Universal Orchestration Enforcement: entityId and entityType are mandatory."],
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
    
    // We enforce execution context wrapper for isolation and RBAC.
    const context: ExecutionContext = {
      actorId: user?.id || "SYSTEM",
      projectId: request.projectId || "",
      entityType: request.entityType,
      entityId: request.entityId,
      action: request.action || "transition",
    };

    return await executeAction(context, "submit_document", async (admin, resolvedRole) => {
      // 1. Execute Primary Workflow Mutation (L3)
      const transitionResult = await workflowOrchestratorService.transition(user, request);
      if (!transitionResult.ok) {
        return {
          success: false,
          status: transitionResult.status,
          errors: [transitionResult.message || "Workflow Transition Failed"],
        };
      }

      // 2. Trigger Automated Derived State Reconciliation (L4 - Section 9)
      const projectId = transitionResult.derived_state_summary?.project_id;
      if (projectId) {
        try {
          await recomputeDerivedState(projectId);
        } catch (err) {
          console.error("[ORCHESTRATOR_L4_FAILURE] Derived state recomputation failed:", err);
        }
      }
      return {
        success: true,
        workflowState: request.targetState,
        data: transitionResult,
      };
    });
  });
}

