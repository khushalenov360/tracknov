"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.frameworkExecutionOrchestrator = frameworkExecutionOrchestrator;
const uuid_1 = require("uuid");
const admin_1 = require("@/lib/supabase/admin");
const governanceContext_1 = require("./governanceContext");
const evidenceValidationEngine_1 = require("./evidenceValidationEngine");
const clarificationRiskEngine_1 = require("./clarificationRiskEngine");
const reviewerAssignmentEngine_1 = require("./reviewerAssignmentEngine");
const replayImpactResolver_1 = require("../replay/replayImpactResolver");
const governanceObservabilityBus_1 = require("./governanceObservabilityBus");
const runtimeProofCollector_1 = require("./runtimeProofCollector");
/**
 * AUTHORITATIVE ORCHESTRATION LAYER
 * Governs the entire Tracknov certification lifecycle.
 */
function frameworkExecutionOrchestrator(params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const admin = (0, admin_1.createAdminClient)();
        const traceId = (0, uuid_1.v4)();
        const causalityChainId = params.payload.causalityChainId || (0, uuid_1.v4)();
        // 1. Framework Version Discovery
        const { data: project } = yield admin
            .from("projects")
            .select("manual_version_id, manual_versions(version_code)")
            .eq("id", params.projectId)
            .single();
        const frameworkVersion = ((_a = project === null || project === void 0 ? void 0 : project.manual_versions) === null || _a === void 0 ? void 0 : _a.version_code) || "GI_V1";
        // 2. Establish Governance Context
        return yield governanceContext_1.governanceLocalStorage.run({
            projectId: params.projectId,
            actorId: params.actorId,
            replayMode: params.action === "REPLAY",
            frameworkVersion,
            traceId,
            causalityChainId
        }, () => __awaiter(this, void 0, void 0, function* () {
            try {
                // 3. Concurrency Law: Acquire Replay Lock
                const { error: lockError } = yield admin.rpc("acquire_governance_lock", {
                    p_project_id: params.projectId,
                    p_trace_id: traceId
                });
                if (lockError) {
                    throw new Error(`CONCURRENCY_VIOLATION: Project is currently locked for another orchestration cycle. ${lockError.message}`);
                }
                // 4. VALIDATION INTERCEPTION ORDER
                // 4.1 Tenant Isolation (Implicit in Context + RLS, but we'll add a check)
                if (!params.projectId)
                    throw new Error("TENANT_ISOLATION_FAILURE: Missing Project ID");
                // 4.2 RBAC Validation (Placeholder for actual RBAC service call)
                // verifyAccess(params.actorId, params.action);
                // 4.3 Workflow Validation
                // verifyWorkflowTransition(params.projectId, params.payload.currentStatus, params.action);
                // 4.4 Evidence Validation
                if (params.action === "UPLOAD" || params.action === "REVIEW") {
                    const evidenceId = params.payload.evidenceId || params.payload.documentId;
                    if (evidenceId) {
                        const validation = yield (0, evidenceValidationEngine_1.validateEvidence)(params.projectId, evidenceId);
                        if (!validation.isValid) {
                            throw new Error(`EVIDENCE_VALIDATION_FAILURE: ${validation.errors.join(", ")}`);
                        }
                    }
                }
                // 4.5 Dependency Validation & Replay Impact
                if (params.action === "APPROVE" || params.action === "REJECT") {
                    const impact = yield (0, replayImpactResolver_1.resolveReplayImpact)(params.projectId, params.payload.entityId, "evidence");
                    if (impact.certificationImpacted && frameworkVersion === "GI_V2") {
                        // V2 strictly forbids silent certification impact without explicit L5 override
                        throw new Error("REPLAY_IMPACT_FAILURE: Approval would invalidate existing certification state.");
                    }
                }
                // 4.6 Clarification Risk Check
                if (params.action === "REVIEW") {
                    const risk = (0, clarificationRiskEngine_1.calculateClarificationRisk)(params.payload.metadata || {}, {});
                    if (risk.riskLevel === "CRITICAL") {
                        yield (0, governanceObservabilityBus_1.emitGovernanceEvent)({
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
                    const assignment = yield (0, reviewerAssignmentEngine_1.determineReviewerAssignment)(params.projectId, params.payload.documentId);
                    // Persist assignment to workflow_tasks
                    yield admin.from("workflow_tasks").insert({
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
                yield admin.from("audit_logs").insert({
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
                yield (0, runtimeProofCollector_1.collectRuntimeProof)({
                    proofType: "ORCHESTRATION_SUCCESS",
                    runtimeSource: "frameworkExecutionOrchestrator",
                    projectId: params.projectId,
                    payload: { action: params.action, frameworkVersion }
                });
                // 9. Release Lock
                yield admin.from("replay_locks").delete().eq("project_id", params.projectId).eq("lock_holder_trace_id", traceId);
                return {
                    traceId,
                    status: "SUCCESS",
                    causalityChainId,
                    lineageHash: "LINEAGE_" + (0, uuid_1.v4)().split("-")[0] // Placeholder
                };
            }
            catch (err) {
                // Failure conditions: Immediate Fail
                console.error("[ORCHESTRATOR_FAILURE]", err);
                // Ensure lock is released even on failure
                yield admin.from("replay_locks").delete().eq("project_id", params.projectId).eq("lock_holder_trace_id", traceId);
                return {
                    traceId,
                    status: "FAILED",
                    causalityChainId,
                    error: err.message
                };
            }
        }));
    });
}
