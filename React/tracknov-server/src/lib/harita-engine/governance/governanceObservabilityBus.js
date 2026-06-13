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
exports.governanceTelemetry = void 0;
exports.emitGovernanceEvent = emitGovernanceEvent;
const admin_1 = require("@/lib/supabase/admin");
const governanceContext_1 = require("./governanceContext");
/**
 * Enterprise Governance Telemetry Bus.
 * Centralizes all governance-related runtime observations for audit and alerting.
 */
function emitGovernanceEvent(params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const context = governanceContext_1.governanceLocalStorage.getStore();
        const replayMode = (_a = context === null || context === void 0 ? void 0 : context.replayMode) !== null && _a !== void 0 ? _a : false;
        const projectId = params.projectId || (context === null || context === void 0 ? void 0 : context.projectId);
        const actorId = context === null || context === void 0 ? void 0 : context.actorId;
        const event = {
            projectId,
            actorId,
            category: params.category,
            severity: params.severity,
            sourceLayer: params.sourceLayer,
            replayMode,
            payload: params.payload || {},
            traceId: context === null || context === void 0 ? void 0 : context.traceId,
            parentTraceId: context === null || context === void 0 ? void 0 : context.parentTraceId,
            causalityChainId: context === null || context === void 0 ? void 0 : context.causalityChainId,
        };
        // Persist to the immutable governance observability ledger
        const admin = (0, admin_1.createAdminClient)();
        const { error } = yield admin.from("governance_observability_events").insert({
            project_id: event.projectId === "SYSTEM" ? null : event.projectId,
            actor_id: event.actorId,
            category: event.category,
            severity: event.severity,
            source_layer: event.sourceLayer,
            replay_mode: event.replayMode,
            payload: event.payload,
            trace_id: event.traceId,
            parent_trace_id: event.parentTraceId,
            causality_chain_id: event.causalityChainId,
        });
        if (error) {
            console.error("[GOVERNANCE_OBSERVABILITY_ERROR] Failed to persist telemetry event:", error);
        }
        // Log to console for real-time observability in dev/staging
        const logPrefix = `[GOVERNANCE_${event.severity.toUpperCase()}] [${event.sourceLayer}] [${event.category}]`;
        if (event.severity === "critical") {
            console.error(logPrefix, event.payload);
        }
        else if (event.severity === "warning") {
            console.warn(logPrefix, event.payload);
        }
        else {
            console.log(logPrefix, event.payload);
        }
    });
}
/**
 * Utility to emit common governance events
 */
exports.governanceTelemetry = {
    replayStarted: (projectId, snapshotId) => emitGovernanceEvent({
        category: "REPLAY_LIFECYCLE",
        severity: "info",
        sourceLayer: "REPLAY_ENGINE",
        projectId,
        payload: { status: "started", snapshotId }
    }),
    replayCompleted: (projectId, result) => emitGovernanceEvent({
        category: "REPLAY_LIFECYCLE",
        severity: "info",
        sourceLayer: "REPLAY_ENGINE",
        projectId,
        payload: Object.assign({ status: "completed" }, result)
    }),
    isolationViolation: (projectId, attemptedAccess) => emitGovernanceEvent({
        category: "ISOLATION_VIOLATION",
        severity: "critical",
        sourceLayer: "TENANT_GUARD",
        projectId,
        payload: { attemptedAccess }
    }),
    authFailure: (projectId, operation, reason) => emitGovernanceEvent({
        category: "AUTHORIZATION_FAILURE",
        severity: "warning",
        sourceLayer: "AUTH_Z_ENGINE",
        projectId,
        payload: { operation, reason }
    }),
    purityViolation: (projectId, operation) => emitGovernanceEvent({
        category: "PURITY_VIOLATION",
        severity: "critical",
        sourceLayer: "MUTATION_INTERCEPTOR",
        projectId,
        payload: { operation }
    })
};
