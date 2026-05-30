import { createAdminClient } from "@/lib/supabase/admin";
import { governanceIncidents } from "./governanceIncidentEngine";

/**
 * Runtime Entropy Detection Engine.
 * Detects chaotic patterns in governance execution that signal systemic instability.
 */
export async function detectRuntimeEntropy(projectId: string): Promise<void> {
  const admin = createAdminClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // 1. Detect Queue Instability (high failure rate in last hour)
  const { count: failedItems } = await admin
    .from("replay_queue")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", projectId)
    .eq("status", "failed")
    .gt("updated_at", oneHourAgo);

  if (failedItems && failedItems > 5) {
    await reportEntropy(projectId, "queue_instability", "critical", { failedItems });
  }

  // 1.1 Detect Queue Starvation (stale items in queue)
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: staleItems } = await admin
    .from("replay_queue")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", projectId)
    .eq("status", "queued")
    .lt("created_at", fiveMinsAgo);

  if (staleItems && staleItems > 0) {
    await reportEntropy(projectId, "queue_instability", "warning", { entropyType: "queue_instability", staleItems });
  }

  // 2. Detect Recurring Override Loops (same actor overriding same type repeatedly)
  const { data: recentOverrides } = await admin
    .from("override_safety_reports")
    .select("actor_id, override_type")
    .eq("project_id", projectId)
    .gt("created_at", oneHourAgo);

  const loopMap: Record<string, number> = {};
  recentOverrides?.forEach(o => {
    const key = `${o.actor_id}:${o.override_type}`;
    loopMap[key] = (loopMap[key] || 0) + 1;
  });

  for (const [key, count] of Object.entries(loopMap)) {
    if (count > 3) {
      await reportEntropy(projectId, "recurring_override_loop", "warning", { actorId: key.split(':')[0], type: key.split(':')[1], count });
    }
  }

  // 3. Detect Anomalous Workflow Churn (too many transitions in a short time)
  const { count: workflowTransitions } = await admin
    .from("workflow_history")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", projectId)
    .gt("created_at", oneHourAgo);

  if (workflowTransitions && workflowTransitions > 20) {
    await reportEntropy(projectId, "anomalous_workflow_churn", "warning", { transitions: workflowTransitions });
  }

  // 4. Detect Drift Explosion (massive un-reconciled items)
  const { count: pendingDrift } = await admin
    .from("reconciliation_items")
    .select("*", { count: 'exact', head: true })
    .eq("project_id", projectId)
    .eq("status", "pending");

  if (pendingDrift && pendingDrift > 15) {
    await reportEntropy(projectId, "drift_explosion", "critical", { pendingDrift });
  }
}

async function reportEntropy(
  projectId: string, 
  type: string, 
  severity: "info" | "warning" | "critical", 
  details: any
): Promise<void> {
  const admin = createAdminClient();
  
  await admin.from("runtime_entropy_events").insert({
    project_id: projectId,
    entropy_type: type,
    severity,
    details
  });

  if (severity === "critical" || severity === "warning") {
    await governanceIncidents.entropyWarning(projectId, { entropyType: type, ...details });
  }
}
