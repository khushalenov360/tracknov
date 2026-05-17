import { createAdminClient } from "@/lib/supabase/admin";
import { governanceLocalStorage } from "./governanceContext";
import { validateEvidence } from "./evidenceValidationEngine";
import { calculateClarificationRisk } from "./clarificationRiskEngine";
import { determineReviewerAssignment } from "./reviewerAssignmentEngine";
import { resolveReplayImpact } from "../replay/replayImpactResolver";
import { emitGovernanceEvent } from "./governanceObservabilityBus";
import { collectRuntimeProof } from "./runtimeProofCollector";

export interface OrchestrationResult {
  traceId: string;
  status: "SUCCESS" | "FAILED";
  causalityChainId: string;
  lineageHash?: string;
  error?: string;
}

/**
 * AUTHORITATIVE ORCHESTRATION LAYER
 * Governs the entire Tracknov certification lifecycle.
 */
export async function frameworkExecutionOrchestrator(params: {
  projectId: string;
  actorId: string;
  action: "UPLOAD" | "REVIEW" | "APPROVE" | "REJECT" | "REPLAY";
  payload: any;
}): Promise<OrchestrationResult> {
  const admin = createAdminClient();
  const traceId = crypto.randomUUID();
  const causalityChainId = params.payload.causalityChainId || crypto.randomUUID();

  // 1. Framework Version Discovery
  const { data: project } = await admin
    .from("projects")
    .select("manual_version_id, manual_versions(version_code)")
    .eq("id", params.projectId)
    .single();

  const frameworkVersion = (project as any)?.manual_versions?.version_code || "GI_V1";

  // 2. Establish Governance Context
  return await governanceLocalStorage.run({
    projectId: params.projectId,
    actorId: params.actorId,
    replayMode: params.action === "REPLAY",
    frameworkVersion,
    traceId,
    causalityChainId
  }, async () => {
    try {
      // 3. Concurrency Law: Acquire Replay Lock
      const { error: lockError } = await admin.rpc("acquire_governance_lock", {
        p_project_id: params.projectId,
        p_trace_id: traceId
      });

      if (lockError) {
        throw new Error(`CONCURRENCY_VIOLATION: Project is currently locked for another orchestration cycle. ${lockError.message}`);
      }

      // 4. VALIDATION INTERCEPTION ORDER
      
      // 4.1 Tenant Isolation (Implicit in Context + RLS, but we'll add a check)
      if (!params.projectId) throw new Error("TENANT_ISOLATION_FAILURE: Missing Project ID");

      // 4.2 RBAC Validation (Placeholder for actual RBAC service call)
      // verifyAccess(params.actorId, params.action);

      // 4.3 Workflow Validation
      // verifyWorkflowTransition(params.projectId, params.payload.currentStatus, params.action);

      // 4.4 Evidence Validation
      if (params.action === "UPLOAD" || params.action === "REVIEW") {
        const evidenceId = params.payload.evidenceId || params.payload.documentId;
        if (evidenceId) {
          const validation = await validateEvidence(params.projectId, evidenceId);
          if (!validation.isValid) {
            throw new Error(`EVIDENCE_VALIDATION_FAILURE: ${validation.errors.join(", ")}`);
          }
        }
      }

      // 4.5 Dependency Validation & Replay Impact
      if (params.action === "APPROVE" || params.action === "REJECT") {
        const impact = await resolveReplayImpact(params.projectId, params.payload.entityId, "evidence");
        if (impact.certificationImpacted && frameworkVersion === "GI_V2") {
          // V2 strictly forbids silent certification impact without explicit L5 override
          throw new Error("REPLAY_IMPACT_FAILURE: Approval would invalidate existing certification state.");
        }
      }

      // 4.6 Clarification Risk Check
      if (params.action === "REVIEW") {
        const risk = calculateClarificationRisk(params.payload.metadata || {}, {});
        if (risk.riskLevel === "CRITICAL") {
          await emitGovernanceEvent({
            category: "HIGH_CLARIFICATION_RISK",
            severity: "warning",
            sourceLayer: "orchestrator",
            projectId: params.projectId,
            payload: { risk }
          });
        }
      }

      // 5. DETERMINISTIC QUEUE ROUTING
      if (params.action === "UPLOAD") {
        const assignment = await determineReviewerAssignment(params.projectId, params.payload.documentId);
        // Persist assignment to workflow_tasks
        await admin.from("workflow_tasks").insert({
          project_id: params.projectId,
          submittal_id: params.payload.documentId,
          assigned_user_id: assignment.reviewerId,
          status: "PENDING",
          priority: assignment.priority === 3 ? "HIGH" : "MEDIUM"
        });
      }

      // 6. Transaction Commit (Implicit in the fact we reach here without throwing)
      // Real implementation would use a Supabase transaction if possible, 
      // or ensure idempotency via 'audit_logs' and 'causality_chain_id'.

      // 7. Audit Law: Persist Lineage
      await admin.from("audit_logs").insert({
        project_id: params.projectId,
        actor_id: params.actorId,
        action: params.action,
        summary: `Orchestration ${params.action} completed for framework ${frameworkVersion}`,
        trace_id: traceId,
        causality_chain_id: causalityChainId,
        details: { 
          frameworkVersion,
          action: params.action,
          payload: params.payload
        }
      });

      // 8. Collect Runtime Proof
      await collectRuntimeProof({
        proofType: "ORCHESTRATION_SUCCESS",
        runtimeSource: "frameworkExecutionOrchestrator",
        projectId: params.projectId,
        payload: { action: params.action, frameworkVersion }
      });

      // 9. Release Lock
      await admin.from("replay_locks").delete().eq("project_id", params.projectId).eq("lock_holder_trace_id", traceId);

      return {
        traceId,
        status: "SUCCESS",
        causalityChainId,
        lineageHash: "LINEAGE_" + crypto.randomUUID().split("-")[0] // Placeholder
      };

    } catch (err: any) {
      // Failure conditions: Immediate Fail
      console.error("[ORCHESTRATOR_FAILURE]", err);
      
      // Ensure lock is released even on failure
      await admin.from("replay_locks").delete().eq("project_id", params.projectId).eq("lock_holder_trace_id", traceId);

      return {
        traceId,
        status: "FAILED",
        causalityChainId,
        error: err.message
      };
    }
  });
}
