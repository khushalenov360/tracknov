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
exports.detectRuntimeEntropy = detectRuntimeEntropy;
const admin_1 = require("@/lib/supabase/admin");
const governanceIncidentEngine_1 = require("./governanceIncidentEngine");
/**
 * Runtime Entropy Detection Engine.
 * Detects chaotic patterns in governance execution that signal systemic instability.
 */
function detectRuntimeEntropy(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        // 1. Detect Queue Instability (high failure rate in last hour)
        const { count: failedItems } = yield admin
            .from("replay_queue")
            .select("*", { count: 'exact', head: true })
            .eq("project_id", projectId)
            .eq("status", "failed")
            .gt("updated_at", oneHourAgo);
        if (failedItems && failedItems > 5) {
            yield reportEntropy(projectId, "queue_instability", "critical", { failedItems });
        }
        // 1.1 Detect Queue Starvation (stale items in queue)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { count: staleItems } = yield admin
            .from("replay_queue")
            .select("*", { count: 'exact', head: true })
            .eq("project_id", projectId)
            .eq("status", "queued")
            .lt("created_at", fiveMinsAgo);
        if (staleItems && staleItems > 0) {
            yield reportEntropy(projectId, "queue_instability", "warning", { entropyType: "queue_instability", staleItems });
        }
        // 2. Detect Recurring Override Loops (same actor overriding same type repeatedly)
        const { data: recentOverrides } = yield admin
            .from("override_safety_reports")
            .select("actor_id, override_type")
            .eq("project_id", projectId)
            .gt("created_at", oneHourAgo);
        const loopMap = {};
        recentOverrides === null || recentOverrides === void 0 ? void 0 : recentOverrides.forEach(o => {
            const key = `${o.actor_id}:${o.override_type}`;
            loopMap[key] = (loopMap[key] || 0) + 1;
        });
        for (const [key, count] of Object.entries(loopMap)) {
            if (count > 3) {
                yield reportEntropy(projectId, "recurring_override_loop", "warning", { actorId: key.split(':')[0], type: key.split(':')[1], count });
            }
        }
        // 3. Detect Anomalous Workflow Churn (too many transitions in a short time)
        const { count: workflowTransitions } = yield admin
            .from("workflow_history")
            .select("*", { count: 'exact', head: true })
            .eq("project_id", projectId)
            .gt("created_at", oneHourAgo);
        if (workflowTransitions && workflowTransitions > 20) {
            yield reportEntropy(projectId, "anomalous_workflow_churn", "warning", { transitions: workflowTransitions });
        }
        // 4. Detect Drift Explosion (massive un-reconciled items)
        const { count: pendingDrift } = yield admin
            .from("reconciliation_items")
            .select("*", { count: 'exact', head: true })
            .eq("project_id", projectId)
            .eq("status", "pending");
        if (pendingDrift && pendingDrift > 15) {
            yield reportEntropy(projectId, "drift_explosion", "critical", { pendingDrift });
        }
    });
}
function reportEntropy(projectId, type, severity, details) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        yield admin.from("runtime_entropy_events").insert({
            project_id: projectId,
            entropy_type: type,
            severity,
            details
        });
        if (severity === "critical" || severity === "warning") {
            yield governanceIncidentEngine_1.governanceIncidents.entropyWarning(projectId, Object.assign({ entropyType: type }, details));
        }
    });
}
