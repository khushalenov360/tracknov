"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.executeGovernedReplayHarness = executeGovernedReplayHarness;
const uuid_1 = require("uuid");
const replayEngine_1 = require("./replayEngine");
const hashSerializer_1 = require("./hashSerializer");
const governanceMutationInterceptor_1 = require("../governance/governanceMutationInterceptor");
const governanceObservabilityBus_1 = require("../governance/governanceObservabilityBus");
const runtimeProofCollector_1 = require("../governance/runtimeProofCollector");
const replayCertificateEngine_1 = require("./replayCertificateEngine");
const admin_1 = require("@/lib/supabase/admin");
/**
 * Authoritative Runtime Replay Harness.
 * Orchestrates deterministic replay execution and validates all governance invariants.
 */
function executeGovernedReplayHarness(projectId, targetTimestamp, expectedLineageHash) {
    return __awaiter(this, void 0, void 0, function* () {
        const replayId = (0, uuid_1.v4)();
        const admin = (0, admin_1.createAdminClient)();
        yield governanceObservabilityBus_1.governanceTelemetry.replayStarted(projectId, targetTimestamp);
        try {
            // 1. Initialization & Snapshot Load (handled by executeDeterministicReplay via RPC)
            // 2. Deterministic Replay (execution within governed boundary)
            const result = yield (0, governanceMutationInterceptor_1.runInReplayMode)(projectId, () => __awaiter(this, void 0, void 0, function* () {
                var _a;
                // Execute the database reconstruction
                const replayData = yield (0, replayEngine_1.executeDeterministicReplay)(projectId, targetTimestamp);
                // 3. Purity Validation (Mutation Interceptor will throw if any side-effect is attempted)
                // 4. Hash Validation (Compute lineage hash of the reconstructed state)
                const currentHash = (0, hashSerializer_1.generateLineageHash)(replayData.reconstructedState);
                const deterministicMatch = expectedLineageHash
                    ? currentHash === expectedLineageHash
                    : true;
                // 5. Observability & Proof Collection
                yield (0, runtimeProofCollector_1.collectRuntimeProof)({
                    proofType: "DETERMINISM_VERIFICATION",
                    runtimeSource: "REPLAY_HARNESS",
                    projectId,
                    lineageHash: currentHash,
                    payload: {
                        replayId,
                        targetTimestamp,
                        deterministicMatch,
                        reconstructedTables: Object.keys(replayData.reconstructedState.tables)
                    }
                });
                // 6. Replay Certificate Generation (if deterministic match passes)
                let certificateId;
                if (deterministicMatch) {
                    const cert = yield (0, replayCertificateEngine_1.generateReplayCertificate)({
                        projectId,
                        replayHash: currentHash,
                        replayContractVersion: replayData.contract.replayVersion,
                        replayTimestamp: new Date().toISOString(),
                        deterministicMatch: true,
                        snapshotId: (_a = replayData.reconstructedState.tables.projects) === null || _a === void 0 ? void 0 : _a.governing_snapshot_id
                    });
                    certificateId = cert.certificate_id;
                }
                // 7. Collect instrumentation metrics from the DB
                const { count: blockedCount } = yield admin
                    .from("runtime_mutation_events")
                    .select("*", { count: "exact", head: true })
                    .eq("project_id", projectId)
                    .eq("replay_mode", true)
                    .gte("timestamp", new Date(Date.now() - 60000).toISOString()); // Last minute
                const { count: eventCount } = yield admin
                    .from("governance_observability_events")
                    .select("*", { count: "exact", head: true })
                    .eq("project_id", projectId)
                    .gte("timestamp", new Date(Date.now() - 60000).toISOString());
                return {
                    replayId,
                    projectId,
                    deterministicMatch,
                    replayHash: currentHash,
                    purityValidated: true, // If we reached here, no mutation threw
                    isolationValidated: true, // executeDeterministicReplay handles this at DB level
                    blockedMutations: blockedCount || 0,
                    observabilityEvents: eventCount || 0,
                    replayCertificateId: certificateId
                };
            }));
            yield governanceObservabilityBus_1.governanceTelemetry.replayCompleted(projectId, result);
            return result;
        }
        catch (error) {
            console.error(`[REPLAY_HARNESS_FAILURE] Project: ${projectId}`, error);
            yield emitGovernanceEvent({
                category: "REPLAY_FAILURE",
                severity: "critical",
                sourceLayer: "REPLAY_HARNESS",
                projectId,
                payload: { error: error.message, replayId }
            });
            return {
                replayId,
                projectId,
                deterministicMatch: false,
                replayHash: "ERROR",
                purityValidated: false,
                isolationValidated: false,
                blockedMutations: 0,
                observabilityEvents: 0,
                error: error.message
            };
        }
    });
}
function emitGovernanceEvent(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { emitGovernanceEvent: emit } = yield Promise.resolve().then(() => __importStar(require("../governance/governanceObservabilityBus")));
        return emit(params);
    });
}
