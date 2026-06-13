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
exports.governanceIncidents = void 0;
exports.reportGovernanceIncident = reportGovernanceIncident;
const admin_1 = require("@/lib/supabase/admin");
const governanceContext_1 = require("./governanceContext");
const governanceObservabilityBus_1 = require("./governanceObservabilityBus");
/**
 * Enterprise Governance Incident Engine.
 * Formally registers and tracks governance-critical failures and anomalies.
 */
function reportGovernanceIncident(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = governanceContext_1.governanceLocalStorage.getStore();
        const traceId = context === null || context === void 0 ? void 0 : context.traceId;
        const actorId = params.actorId || (context === null || context === void 0 ? void 0 : context.actorId);
        const admin = (0, admin_1.createAdminClient)();
        const { data, error } = yield admin
            .from("governance_incidents")
            .insert({
            incident_type: params.type,
            severity: params.severity,
            project_id: params.projectId,
            trace_id: traceId,
            actor_id: actorId,
            replay_context: params.replayContext || {},
            resolution_status: "open",
            resolution_notes: params.resolutionNotes
        })
            .select("incident_id")
            .single();
        if (error) {
            console.error("[GOVERNANCE_INCIDENT_ERROR] Failed to record incident:", error);
            // We still emit an observability event even if persistence fails
        }
        // Also emit to the observability bus for real-time alerting
        yield (0, governanceObservabilityBus_1.emitGovernanceEvent)({
            category: `INCIDENT_${params.type.toUpperCase()}`,
            severity: params.severity === "system_failure" ? "critical" : params.severity,
            sourceLayer: "INCIDENT_ENGINE",
            projectId: params.projectId,
            payload: Object.assign({ incidentId: data === null || data === void 0 ? void 0 : data.incident_id, incidentType: params.type }, params.replayContext)
        });
        return (data === null || data === void 0 ? void 0 : data.incident_id) || "FAILED_TO_PERSIST";
    });
}
exports.governanceIncidents = {
    replayConflict: (projectId, replayContext) => reportGovernanceIncident({
        type: "replay_conflict",
        severity: "warning",
        projectId,
        replayContext
    }),
    staleApproval: (projectId, actorId) => reportGovernanceIncident({
        type: "stale_approval_attempt",
        severity: "warning",
        projectId,
        actorId
    }),
    overrideAbuse: (projectId, actorId, replayContext) => reportGovernanceIncident({
        type: "override_abuse_attempt",
        severity: "critical",
        projectId,
        actorId,
        replayContext
    }),
    tenantViolation: (projectId, actorId, attemptedAccess) => reportGovernanceIncident({
        type: "tenant_boundary_violation",
        severity: "critical",
        projectId,
        actorId,
        replayContext: { attemptedAccess }
    }),
    hashMismatch: (projectId, replayContext) => reportGovernanceIncident({
        type: "replay_hash_mismatch",
        severity: "critical",
        projectId,
        replayContext
    }),
    driftFailure: (projectId, error) => reportGovernanceIncident({
        type: "drift_detection_failure",
        severity: "warning",
        projectId,
        replayContext: { error }
    }),
    entropyWarning: (projectId, metrics) => reportGovernanceIncident({
        type: "runtime_entropy_warning",
        severity: "warning",
        projectId,
        replayContext: { metrics }
    })
};
