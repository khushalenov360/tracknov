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
exports.proofCollection = void 0;
exports.collectRuntimeProof = collectRuntimeProof;
const admin_1 = require("@/lib/supabase/admin");
const governanceContext_1 = require("./governanceContext");
const governanceObservabilityBus_1 = require("./governanceObservabilityBus");
const evolution_1 = require("./evolution");
/**
 * Authoritative Runtime Proof Collector.
 * Aggregates actual runtime evidence of governance compliance and adversarial resistance.
 * Rejects frontend-generated or simulated proof payloads.
 */
function collectRuntimeProof(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = governanceContext_1.governanceLocalStorage.getStore();
        const projectId = params.projectId || (context === null || context === void 0 ? void 0 : context.projectId);
        if (!projectId || projectId === "SYSTEM") {
            // Standard system events don't necessarily need a proof artifact unless project-linked
            return;
        }
        // Fetch authoritative governance version context
        const versionContext = yield evolution_1.governanceEvolutionEngine.getLatestContext();
        const artifact = {
            projectId,
            proofType: params.proofType,
            runtimeSource: params.runtimeSource,
            payload: params.payload,
            lineageHash: params.lineageHash,
            traceId: context === null || context === void 0 ? void 0 : context.traceId,
            parentTraceId: context === null || context === void 0 ? void 0 : context.parentTraceId,
            causalityChainId: context === null || context === void 0 ? void 0 : context.causalityChainId,
        };
        // Persist to the immutable runtime proof ledger
        const admin = (0, admin_1.createAdminClient)();
        const { error } = yield admin.from("runtime_proof_artifacts").insert({
            project_id: artifact.projectId,
            proof_type: artifact.proofType,
            runtime_source: artifact.runtimeSource,
            payload: artifact.payload,
            lineage_hash: artifact.lineageHash,
            trace_id: artifact.traceId,
            parent_trace_id: artifact.parentTraceId,
            causality_chain_id: artifact.causalityChainId,
            governance_version_context: versionContext,
        });
        if (error) {
            console.error("[PROOF_COLLECTOR_ERROR] Failed to persist proof artifact:", error);
            return;
        }
        // Emit a telemetry event indicating a new proof artifact has been anchored
        yield (0, governanceObservabilityBus_1.emitGovernanceEvent)({
            category: "PROOF_ANCHORED",
            severity: "info",
            sourceLayer: "PROOF_COLLECTOR",
            projectId: artifact.projectId,
            payload: {
                proofType: artifact.proofType,
                runtimeSource: artifact.runtimeSource
            }
        });
    });
}
/**
 * Specialized proof collection helpers
 */
exports.proofCollection = {
    dbWriteBlocked: (projectId, mutation) => collectRuntimeProof({
        proofType: "MUTATION_INTERCEPTION",
        runtimeSource: "DB_GATEWAY",
        projectId,
        payload: Object.assign({ operation: "DB_WRITE" }, mutation)
    }),
    queueSuppressed: (projectId, message) => collectRuntimeProof({
        proofType: "QUEUE_SUPPRESSION",
        runtimeSource: "EVENT_BUS",
        projectId,
        payload: { message }
    }),
    isolationRejection: (projectId, violation) => collectRuntimeProof({
        proofType: "TENANT_ISOLATION",
        runtimeSource: "SECURITY_GUARD",
        projectId,
        payload: violation
    }),
    determinismProof: (projectId, replayHash, result) => collectRuntimeProof({
        proofType: "DETERMINISM_VERIFICATION",
        runtimeSource: "REPLAY_HARNESS",
        projectId,
        lineageHash: replayHash,
        payload: result
    }),
    replayCertificate: (projectId, certificateId, replayHash) => collectRuntimeProof({
        proofType: "REPLAY_CERTIFICATE",
        runtimeSource: "CERTIFICATE_ENGINE",
        projectId,
        lineageHash: replayHash,
        payload: { certificateId }
    })
};
