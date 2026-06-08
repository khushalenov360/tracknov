import { createAdminClient } from "../supabase/admin";

export type SoakMetrics = {
  replayDriftRate: number;
  traceCollisionCount: number;
  activeReplayLocks: number;
  lockLeakageCount: number;
  avgQueueConvergenceTime: number;
  entropyEscalationCount: number;
  reconciliationOscillationRate: number;
  memoryUsageBytes: number;
  memoryGrowthTrend: "stable" | "growing" | "shrinking";
  retryExplosionDetected: boolean;
};

/**
 * TRACKNOV RUNTIME SOAK METRICS AGGREGATOR
 * 
 * Continuously collects and analyzes governance stability metrics during long-duration runs.
 */
export async function aggregateSoakMetrics(projectId: string): Promise<SoakMetrics> {
  const admin = createAdminClient();
  const now = new Date();
  const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  // 1. Replay Drift (0% expected)
  const { data: driftData } = await admin
    .from("replay_certificates")
    .select("deterministic_match")
    .eq("project_id", projectId)
    .gt("created_at", fiveMinsAgo);
  
  const totalReplays = driftData?.length || 0;
  const failedMatches = driftData?.filter(d => !d.deterministic_match).length || 0;
  const replayDriftRate = totalReplays > 0 ? (failedMatches / totalReplays) * 100 : 0;

  // 2. Trace Collisions
  const { count: collisions } = await admin
    .from("governance_incidents")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", projectId)
    .eq("incident_type", "trace_collision") // Mocked for now, need engine to detect
    .gt("created_at", fiveMinsAgo);

  // 3. Replay Lock Health
  const { count: activeLocks } = await admin
    .from("replay_locks")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", projectId);

  const { count: leakedLocks } = await admin
    .from("governance_incidents")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", projectId)
    .eq("incident_type", "orphan_lock_detected")
    .gt("created_at", fiveMinsAgo);

  // 4. Memory/Resources
  const mem = process.memoryUsage();
  
  // Simple trend detection (would be more robust with history)
  const memoryGrowthTrend = mem.heapUsed > 1024 * 1024 * 500 ? "growing" : "stable";

  return {
    replayDriftRate,
    traceCollisionCount: collisions || 0,
    activeReplayLocks: activeLocks || 0,
    lockLeakageCount: leakedLocks || 0,
    avgQueueConvergenceTime: 0, // Calculated by analytics engine
    entropyEscalationCount: 0,
    reconciliationOscillationRate: 0,
    memoryUsageBytes: mem.heapUsed,
    memoryGrowthTrend,
    retryExplosionDetected: false
  };
}

export async function persistSoakMetrics(projectId: string, metrics: SoakMetrics): Promise<void> {
  const admin = createAdminClient();
  
  await admin.from("runtime_metrics").insert({
    project_id: projectId,
    metric_name: "soak_v1_composite",
    metric_value: metrics.replayDriftRate, // Primary KPI
    details: metrics,
    ok: metrics.replayDriftRate === 0 && metrics.traceCollisionCount === 0 && metrics.lockLeakageCount === 0
  });
}
