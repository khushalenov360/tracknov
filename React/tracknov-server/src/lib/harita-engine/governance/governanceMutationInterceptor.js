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
exports.interceptMutation = interceptMutation;
exports.runInReplayMode = runInReplayMode;
exports.runInOperationalMode = runInOperationalMode;
const uuid_1 = require("uuid");
const admin_1 = require("@/lib/supabase/admin");
const governanceContext_1 = require("./governanceContext");
const governanceObservabilityBus_1 = require("./governanceObservabilityBus");
const runtimeProofCollector_1 = require("./runtimeProofCollector");
// Using central GovernanceContext from ./governanceContext
/**
 * Intercepts ACTUAL runtime mutations during replay.
 * Blocks DB writes, queue emissions, and other side-effects when replayMode is active.
 * Records every attempt in the append-only runtime_mutation_events ledger.
 */
function interceptMutation(params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const context = governanceContext_1.governanceLocalStorage.getStore();
        const replayMode = (_a = context === null || context === void 0 ? void 0 : context.replayMode) !== null && _a !== void 0 ? _a : false;
        const projectId = (_b = context === null || context === void 0 ? void 0 : context.projectId) !== null && _b !== void 0 ? _b : "SYSTEM";
        const actorId = context === null || context === void 0 ? void 0 : context.actorId;
        const event = {
            projectId,
            actorId,
            mutationType: params.mutationType,
            sourceLayer: params.sourceLayer,
            replayMode,
            blocked: replayMode,
            reason: params.reason || (replayMode ? "REPLAY_MODE_ACTIVE" : "OPERATIONAL_MODE"),
            traceId: context === null || context === void 0 ? void 0 : context.traceId,
            parentTraceId: context === null || context === void 0 ? void 0 : context.parentTraceId,
            causalityChainId: context === null || context === void 0 ? void 0 : context.causalityChainId,
        };
        // Persist the interception event to the authoritative runtime evidence ledger.
        // We use the admin client directly to ensure the audit log itself is not blocked.
        const admin = (0, admin_1.createAdminClient)();
        const { error } = yield admin.from("runtime_mutation_events").insert({
            project_id: event.projectId === "SYSTEM" ? null : event.projectId,
            actor_id: event.actorId,
            mutation_type: event.mutationType,
            source_layer: event.sourceLayer,
            replay_mode: event.replayMode,
            blocked: event.blocked,
            reason: event.reason,
            trace_id: event.traceId,
            parent_trace_id: event.parentTraceId,
            causality_chain_id: event.causalityChainId,
        });
        if (error) {
            console.error("[GOVERNANCE_INTERCEPTOR_ERROR] Failed to persist mutation event:", error);
        }
        // If blocked, also emit a critical governance telemetry event and collect a runtime proof artifact
        if (event.blocked) {
            yield Promise.all([
                (0, governanceObservabilityBus_1.emitGovernanceEvent)({
                    category: "PURITY_VIOLATION",
                    severity: "critical",
                    sourceLayer: event.sourceLayer,
                    projectId: event.projectId,
                    payload: {
                        mutationType: event.mutationType,
                        reason: event.reason,
                        replayMode: event.replayMode
                    }
                }),
                (0, runtimeProofCollector_1.collectRuntimeProof)({
                    proofType: "MUTATION_INTERCEPTION",
                    runtimeSource: event.sourceLayer,
                    projectId: event.projectId,
                    payload: {
                        mutationType: event.mutationType,
                        reason: event.reason,
                        replayMode: event.replayMode
                    }
                })
            ]);
            throw new Error(`Governance Purity Violation: Attempted [${event.mutationType}] in [${event.sourceLayer}]. Intercepted due to REPLAY_MODE_ACTIVE.`);
        }
    });
}
/**
 * Higher-order function to execute logic within a governed replay boundary.
 */
function runInReplayMode(projectId, fn, actorId) {
    return __awaiter(this, void 0, void 0, function* () {
        return governanceContext_1.governanceLocalStorage.run({
            projectId,
            replayMode: true,
            traceId: (0, uuid_1.v4)(),
            causalityChainId: (0, uuid_1.v4)()
        }, fn);
    });
}
/**
 * Higher-order function to execute logic within a standard operational boundary.
 */
function runInOperationalMode(projectId, fn, actorId) {
    return __awaiter(this, void 0, void 0, function* () {
        return governanceContext_1.governanceLocalStorage.run({
            projectId,
            actorId,
            replayMode: false,
            traceId: (0, uuid_1.v4)(),
            causalityChainId: (0, uuid_1.v4)()
        }, fn);
    });
}
