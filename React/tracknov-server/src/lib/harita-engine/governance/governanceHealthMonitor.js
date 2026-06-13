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
exports.collectGovernanceHealthMetrics = collectGovernanceHealthMetrics;
const admin_1 = require("@/lib/supabase/admin");
/**
 * Governance Health Monitor.
 * Aggregates runtime telemetry and incident data into high-level health signals.
 */
function collectGovernanceHealthMetrics(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        // 1. Fetch relevant counts from observability and incident engines
        const [{ count: totalReplays }, { count: successfulReplays }, { count: conflicts }, { count: overrides }, { count: interceptions }] = yield Promise.all([
            admin.from("governance_observability_events").select("*", { count: 'exact', head: true }).eq("project_id", projectId).eq("category", "REPLAY_LIFECYCLE").gt("created_at", twentyFourHoursAgo),
            admin.from("governance_observability_events").select("*", { count: 'exact', head: true }).eq("project_id", projectId).eq("category", "REPLAY_LIFECYCLE").contains("payload", { status: "completed" }).gt("created_at", twentyFourHoursAgo),
            admin.from("governance_incidents").select("*", { count: 'exact', head: true }).eq("project_id", projectId).eq("incident_type", "replay_conflict").gt("created_at", twentyFourHoursAgo),
            admin.from("override_safety_reports").select("*", { count: 'exact', head: true }).eq("project_id", projectId).gt("created_at", twentyFourHoursAgo),
            admin.from("governance_observability_events").select("*", { count: 'exact', head: true }).eq("project_id", projectId).eq("category", "PURITY_VIOLATION").gt("created_at", twentyFourHoursAgo)
        ]);
        const replaySuccessRate = totalReplays ? (successfulReplays || 0) / totalReplays : 1;
        const replayConflictFrequency = conflicts || 0;
        const overrideFrequency = overrides || 0;
        const mutationInterceptionFrequency = interceptions || 0;
        // 2. Detect queue starvation
        const { data: queuedItems } = yield admin
            .from("replay_queue")
            .select("created_at")
            .eq("project_id", projectId)
            .eq("status", "queued")
            .order("created_at", { ascending: true });
        const queueStarvationDetected = !!(queuedItems && queuedItems.length > 0 &&
            (Date.now() - new Date(queuedItems[0].created_at).getTime()) > 300000); // 5 mins
        const metrics = {
            replaySuccessRate,
            driftConvergenceRate: 0.95, // Simulated for now
            replayConflictFrequency,
            overrideFrequency,
            mutationInterceptionFrequency,
            queueStarvationDetected
        };
        // Persist metrics
        yield admin.from("governance_health_metrics").insert({
            project_id: projectId,
            replay_success_rate: replaySuccessRate,
            drift_convergence_rate: 0.95,
            replay_conflict_count: replayConflictFrequency,
            override_count: overrideFrequency,
            mutation_interception_count: mutationInterceptionFrequency,
            queue_starvation_risk: queueStarvationDetected ? "CRITICAL" : "LOW"
        });
        return metrics;
    });
}
