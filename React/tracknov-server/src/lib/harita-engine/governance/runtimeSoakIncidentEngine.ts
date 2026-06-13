import { createAdminClient } from "@/lib/supabase/admin";
import { governanceIncidents } from "./governanceIncidentEngine";

/**
 * SOAK INCIDENT DETECTOR
 * 
 * Specializes in detecting thermodynamic failures that only manifest over long durations.
 */
export async function detectSoakAnomalies(projectId: string): Promise<void> {
  const admin = createAdminClient();
  const now = new Date();
  
  // 1. Detect Orphan Locks (locks older than 5 minutes)
  const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const { data: orphanLocks } = await admin
    .from("replay_locks")
    .select("*")
    .eq("project_id", projectId)
    .lt("acquired_at", fiveMinsAgo);

  if (orphanLocks && orphanLocks.length > 0) {
    for (const lock of orphanLocks) {
      await governanceIncidents.entropyWarning(projectId, {
        entropyType: "orphan_lock_detected",
        lockTraceId: lock.lock_holder_trace_id,
        acquiredAt: lock.acquired_at
      });
      // Auto-recovery: Force release
      await admin.from("replay_locks").delete().eq("project_id", projectId).eq("lock_holder_trace_id", lock.lock_holder_trace_id);
    }
  }

  // 2. Detect Reconciliation Oscillation (item flipping between states)
  const { data: recentReconciliations } = await admin
    .from("reconciliation_items")
    .select("target_id, status, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(50);

  const oscillationMap: Record<string, number> = {};
  recentReconciliations?.forEach(r => {
    oscillationMap[r.target_id] = (oscillationMap[r.target_id] || 0) + 1;
  });

  for (const [targetId, count] of Object.entries(oscillationMap)) {
    if (count > 10) {
      await governanceIncidents.entropyWarning(projectId, {
        entropyType: "reconciliation_oscillation",
        targetId,
        churnCount: count
      });
    }
  }

  // 3. Detect Unbounded Entropy Growth
  const { count: recentEntropyEvents } = await admin
    .from("runtime_entropy_events")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", projectId)
    .gt("created_at", new Date(now.getTime() - 30 * 60 * 1000).toISOString());

  if (recentEntropyEvents && recentEntropyEvents > 25) {
    await governanceIncidents.entropyWarning(projectId, {
      entropyType: "unbounded_entropy_growth",
      eventCount: recentEntropyEvents,
      window: "30m"
    });
  }
}
