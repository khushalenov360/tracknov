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
exports.detectSoakAnomalies = detectSoakAnomalies;
const admin_1 = require("@/lib/supabase/admin");
const governanceIncidentEngine_1 = require("./governanceIncidentEngine");
/**
 * SOAK INCIDENT DETECTOR
 *
 * Specializes in detecting thermodynamic failures that only manifest over long durations.
 */
function detectSoakAnomalies(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        const now = new Date();
        // 1. Detect Orphan Locks (locks older than 5 minutes)
        const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
        const { data: orphanLocks } = yield admin
            .from("replay_locks")
            .select("*")
            .eq("project_id", projectId)
            .lt("acquired_at", fiveMinsAgo);
        if (orphanLocks && orphanLocks.length > 0) {
            for (const lock of orphanLocks) {
                yield governanceIncidentEngine_1.governanceIncidents.entropyWarning(projectId, {
                    entropyType: "orphan_lock_detected",
                    lockTraceId: lock.lock_holder_trace_id,
                    acquiredAt: lock.acquired_at
                });
                // Auto-recovery: Force release
                yield admin.from("replay_locks").delete().eq("project_id", projectId).eq("lock_holder_trace_id", lock.lock_holder_trace_id);
            }
        }
        // 2. Detect Reconciliation Oscillation (item flipping between states)
        const { data: recentReconciliations } = yield admin
            .from("reconciliation_items")
            .select("target_id, status, updated_at")
            .eq("project_id", projectId)
            .order("updated_at", { ascending: false })
            .limit(50);
        const oscillationMap = {};
        recentReconciliations === null || recentReconciliations === void 0 ? void 0 : recentReconciliations.forEach(r => {
            oscillationMap[r.target_id] = (oscillationMap[r.target_id] || 0) + 1;
        });
        for (const [targetId, count] of Object.entries(oscillationMap)) {
            if (count > 10) {
                yield governanceIncidentEngine_1.governanceIncidents.entropyWarning(projectId, {
                    entropyType: "reconciliation_oscillation",
                    targetId,
                    churnCount: count
                });
            }
        }
        // 3. Detect Unbounded Entropy Growth
        const { count: recentEntropyEvents } = yield admin
            .from("runtime_entropy_events")
            .select("*", { count: 'exact', head: true })
            .eq("project_id", projectId)
            .gt("created_at", new Date(now.getTime() - 30 * 60 * 1000).toISOString());
        if (recentEntropyEvents && recentEntropyEvents > 25) {
            yield governanceIncidentEngine_1.governanceIncidents.entropyWarning(projectId, {
                entropyType: "unbounded_entropy_growth",
                eventCount: recentEntropyEvents,
                window: "30m"
            });
        }
    });
}
