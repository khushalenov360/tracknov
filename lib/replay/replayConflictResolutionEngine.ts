import { createAdminClient } from "@/lib/supabase/admin";
import { governanceLocalStorage } from "../governance/governanceContext";
import { governanceIncidents } from "../governance/governanceIncidentEngine";

export interface ReplayLock {
  projectId: string;
  traceId: string;
  acquiredAt: string;
  expiresAt: string;
}

/**
 * Replay Conflict Resolution Engine.
 * Manages concurrent replay execution and ensures deterministic ordering.
 */
export async function acquireReplayLock(
  projectId: string, 
  lockDurationMs: number = 30000
): Promise<boolean> {
  const admin = createAdminClient();
  const context = governanceLocalStorage.getStore();
  const traceId = context?.traceId;

  if (!traceId) {
    throw new Error("Cannot acquire replay lock without a valid trace context.");
  }

  const expiresAt = new Date(Date.now() + lockDurationMs).toISOString();

  // Try to acquire the lock. 
  // We use a manual transaction-like approach with UPSERT and checking the current owner.
  // Note: For high-volume production, a Redis lock or Postgres advisory lock would be better.
  const { data, error } = await admin.rpc("try_acquire_replay_lock", {
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
    await governanceIncidents.replayConflict(projectId, {
      attemptedTraceId: traceId,
      currentHolderTraceId: data.current_holder_trace_id,
      reason: "Concurrent replay attempt blocked by existing lock"
    });
    return false;
  }

  return true;
}

export async function releaseReplayLock(projectId: string): Promise<void> {
  const admin = createAdminClient();
  const context = governanceLocalStorage.getStore();
  const traceId = context?.traceId;

  if (!traceId) return;

  await admin
    .from("replay_locks")
    .delete()
    .match({ project_id: projectId, lock_holder_trace_id: traceId });
}

export async function enqueueReplayRequest(
  projectId: string,
  targetTimestamp: string,
  priority: number = 0
): Promise<string> {
  const admin = createAdminClient();
  const context = governanceLocalStorage.getStore();
  const traceId = context?.traceId;

  if (!traceId) {
    throw new Error("Cannot enqueue replay without trace context.");
  }

  const { data, error } = await admin
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
}

export async function processReplayQueue(projectId: string): Promise<void> {
  const admin = createAdminClient();
  
  // Find the next item in the queue for this project
  const { data: nextItem, error: fetchError } = await admin
    .from("replay_queue")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "queued")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError || !nextItem) return;

  // Mark as processing
  await admin
    .from("replay_queue")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("queue_id", nextItem.queue_id);

  // The actual replay logic should be called here, usually from a worker or background job
  // In this implementation, we assume the caller will handle the execution after checking the queue
}
