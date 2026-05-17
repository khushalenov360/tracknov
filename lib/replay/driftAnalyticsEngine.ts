import { createAdminClient } from "@/lib/supabase/admin";

export interface DriftAnalyticsReport {
  driftTrendHistory: any[];
  recurringReconciliationItems: any[];
  staleStateHeatmap: Record<string, number>;
  unresolvedDriftAging: any[];
}

/**
 * Long-Duration Drift Analytics Engine.
 * Analyzes historical drift patterns to identify recurring governance vulnerabilities.
 */
export async function generateDriftAnalyticsReport(projectId: string): Promise<DriftAnalyticsReport> {
  const admin = createAdminClient();

  // 1. Fetch historical drift events from the reconciliation_items table
  const { data: reconciliationItems } = await admin
    .from("reconciliation_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  // 2. Calculate recurring items (reconciled multiple times)
  const recurrenceMap: Record<string, number> = {};
  reconciliationItems?.forEach(item => {
    const key = `${item.target_table}:${item.target_id}`;
    recurrenceMap[key] = (recurrenceMap[key] || 0) + 1;
  });
  const recurringReconciliationItems = Object.entries(recurrenceMap)
    .filter(([_, count]) => count > 1)
    .map(([key, count]) => ({ key, count }));

  // 3. Stale-state heatmap (where is drift happening most?)
  const staleStateHeatmap: Record<string, number> = {};
  reconciliationItems?.forEach(item => {
    staleStateHeatmap[item.target_table] = (staleStateHeatmap[item.target_table] || 0) + 1;
  });

  // 4. Unresolved drift aging
  const { data: unresolvedItems } = await admin
    .from("reconciliation_items")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const unresolvedDriftAging = unresolvedItems?.map(item => ({
    id: item.id,
    ageSeconds: (Date.now() - new Date(item.created_at).getTime()) / 1000,
    table: item.target_table
  })) || [];

  const report: DriftAnalyticsReport = {
    driftTrendHistory: [], // Would aggregate over time in a real system
    recurringReconciliationItems,
    staleStateHeatmap,
    unresolvedDriftAging
  };

  // Persist report
  await admin.from("drift_analytics_reports").insert({
    project_id: projectId,
    drift_trend_history: [],
    recurring_reconciliation_items: recurringReconciliationItems,
    stale_state_heatmap: staleStateHeatmap,
    unresolved_drift_aging: unresolvedDriftAging
  });

  return report;
}
