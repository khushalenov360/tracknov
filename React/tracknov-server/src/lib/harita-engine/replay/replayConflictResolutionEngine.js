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
exports.acquireReplayLock = acquireReplayLock;
exports.releaseReplayLock = releaseReplayLock;
exports.enqueueReplayRequest = enqueueReplayRequest;
exports.processReplayQueue = processReplayQueue;
const admin_1 = require("@/lib/supabase/admin");
const governanceContext_1 = require("../governance/governanceContext");
const governanceIncidentEngine_1 = require("../governance/governanceIncidentEngine");
/**
 * Replay Conflict Resolution Engine.
 * Manages concurrent replay execution and ensures deterministic ordering.
 */
function acquireReplayLock(projectId_1) {
    return __awaiter(this, arguments, void 0, function* (projectId, lockDurationMs = 30000) {
        const admin = (0, admin_1.createAdminClient)();
        const context = governanceContext_1.governanceLocalStorage.getStore();
        const traceId = context === null || context === void 0 ? void 0 : context.traceId;
        if (!traceId) {
            throw new Error("Cannot acquire replay lock without a valid trace context.");
        }
        const expiresAt = new Date(Date.now() + lockDurationMs).toISOString();
        // Try to acquire the lock. 
        // We use a manual transaction-like approach with UPSERT and checking the current owner.
        // Note: For high-volume production, a Redis lock or Postgres advisory lock would be better.
        const { data, error } = yield admin.rpc("try_acquire_replay_lock", {
            p_project_id: projectId,
            p_trace_id: traceId,
            p_expires_at: expiresAt
        });
        if (error) {
            console.error("[REPLAY_LOCK_ERROR] Failed to acquire lock:", error);
            return false;
        }
        if (!data.success) {
            // Collision detected
            yield governanceIncidentEngine_1.governanceIncidents.replayConflict(projectId, {
                attemptedTraceId: traceId,
                currentHolderTraceId: data.current_holder_trace_id,
                reason: "Concurrent replay attempt blocked by existing lock"
            });
            return false;
        }
        return true;
    });
}
function releaseReplayLock(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        const context = governanceContext_1.governanceLocalStorage.getStore();
        const traceId = context === null || context === void 0 ? void 0 : context.traceId;
        if (!traceId)
            return;
        yield admin
            .from("replay_locks")
            .delete()
            .match({ project_id: projectId, lock_holder_trace_id: traceId });
    });
}
function enqueueReplayRequest(projectId_1, targetTimestamp_1) {
    return __awaiter(this, arguments, void 0, function* (projectId, targetTimestamp, priority = 0) {
        const admin = (0, admin_1.createAdminClient)();
        const context = governanceContext_1.governanceLocalStorage.getStore();
        const traceId = context === null || context === void 0 ? void 0 : context.traceId;
        if (!traceId) {
            throw new Error("Cannot enqueue replay without trace context.");
        }
        const { data, error } = yield admin
            .from("replay_queue")
            .insert({
            project_id: projectId,
            trace_id: traceId,
            target_timestamp: targetTimestamp,
            status: "queued",
            priority
        })
            .select("queue_id")
            .single();
        if (error) {
            throw new Error(`Failed to enqueue replay: ${error.message}`);
        }
        return data.queue_id;
    });
}
function processReplayQueue(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        // Find the next item in the queue for this project
        const { data: nextItem, error: fetchError } = yield admin
            .from("replay_queue")
            .select("*")
            .eq("project_id", projectId)
            .eq("status", "queued")
            .order("priority", { ascending: false })
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
        if (fetchError || !nextItem)
            return;
        // Mark as processing
        yield admin
            .from("replay_queue")
            .update({ status: "processing", updated_at: new Date().toISOString() })
            .eq("queue_id", nextItem.queue_id);
        // The actual replay logic should be called here, usually from a worker or background job
        // In this implementation, we assume the caller will handle the execution after checking the queue
    });
}
