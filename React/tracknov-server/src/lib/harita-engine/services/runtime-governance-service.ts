import { createAdminClient } from "@/lib/supabase/admin";

type RuntimeEntityType = "submittal" | "credit_stage" | "credit" | "project" | "certification";

type MetricPayload = {
  projectId?: string | null;
  metricName: string;
  metricValue: number;
  ok?: boolean;
  details?: Record<string, unknown>;
};

type AlertPayload = {
  projectId?: string | null;
  alertType: string;
  severity?: "info" | "warning" | "critical";
  message: string;
  context?: Record<string, unknown>;
};

export class RuntimeGovernanceService {
  private get admin() {
    return createAdminClient();
  }

  async recordMetric(payload: MetricPayload) {
    await this.admin.from("runtime_metrics").insert({
      project_id: payload.projectId ?? null,
      metric_name: payload.metricName,
      metric_value: payload.metricValue,
      ok: payload.ok ?? true,
      details: payload.details ?? {},
    });
  }

  async raiseAlert(payload: AlertPayload) {
    await this.admin.from("runtime_alerts").insert({
      project_id: payload.projectId ?? null,
      alert_type: payload.alertType,
      severity: payload.severity ?? "warning",
      message: payload.message,
      context: payload.context ?? {},
    });
  }

  async markStateDesync(params: {
    projectId: string;
    entityType: RuntimeEntityType;
    entityId: string;
    reason: string;
    payload?: Record<string, unknown>;
  }) {
    await this.admin.from("runtime_desync").upsert(
      {
        project_id: params.projectId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        reason: params.reason,
        status: "open",
      },
      {
        onConflict: "project_id,entity_type,entity_id",
        ignoreDuplicates: false,
      },
    );
    await this.admin.from("runtime_reconciliation_queue").insert({
      project_id: params.projectId,
      entity_type: params.entityType,
      entity_id: params.entityId,
      reason: params.reason,
      payload: params.payload ?? {},
      status: "pending",
      next_retry_at: new Date().toISOString(),
    });
    await this.admin.rpc("recompute_project_runtime_block_state", { p_project_id: params.projectId });
    await this.raiseAlert({
      projectId: params.projectId,
      alertType: "state_desync_open",
      severity: "critical",
      message: `STATE_DESYNC opened for ${params.entityType}.`,
      context: { entityId: params.entityId, reason: params.reason },
    });
  }

  async clearStateDesync(projectId: string, entityType?: RuntimeEntityType, entityId?: string) {
    let query = this.admin.from("runtime_desync").update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    }).eq("project_id", projectId).eq("status", "open");

    if (entityType) query = query.eq("entity_type", entityType);
    if (entityId) query = query.eq("entity_id", entityId);
    await query;
    await this.admin.rpc("recompute_project_runtime_block_state", { p_project_id: projectId });
  }

  async hasOpenDesync(projectId: string) {
    const { data, error } = await this.admin
      .from("runtime_desync")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "open");
    if (error) return false;
    return Boolean(data) || false;
  }

  async getDesyncSummary() {
    const { data: open } = await this.admin
      .from("runtime_desync")
      .select("project_id, entity_type, detected_at")
      .eq("status", "open");
    const { data: queue } = await this.admin
      .from("runtime_reconciliation_queue")
      .select("status")
      .in("status", ["pending", "retry"]);
    const byProject = new Map<string, number>();
    for (const row of open ?? []) {
      const key = String((row as any).project_id ?? "");
      if (!key) continue;
      byProject.set(key, (byProject.get(key) ?? 0) + 1);
    }
    return {
      openDesyncCount: (open ?? []).length,
      queuedRepairs: (queue ?? []).length,
      projectsImpacted: byProject.size,
    };
  }

  async runReconciliationBatch(limit = 25) {
    const nowIso = new Date().toISOString();
    const { data: jobs } = await this.admin
      .from("runtime_reconciliation_queue")
      .select("id, project_id, entity_type, entity_id, attempts")
      .in("status", ["pending", "retry"])
      .lte("next_retry_at", nowIso)
      .order("created_at", { ascending: true })
      .limit(limit);

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const job of jobs ?? []) {
      const started = Date.now();
      try {
        await this.admin.from("runtime_reconciliation_queue").update({ status: "processing" }).eq("id", (job as any).id);
        await this.admin.rpc("recompute_credit_scores", { p_project_id: (job as any).project_id });
        await this.admin.rpc("get_project_certification_summary", { p_project_id: (job as any).project_id });

        await this.admin
          .from("runtime_reconciliation_queue")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", (job as any).id);

        await this.clearStateDesync((job as any).project_id, (job as any).entity_type, (job as any).entity_id);
        await this.recordMetric({
          projectId: (job as any).project_id,
          metricName: "runtime_reconciliation_latency_ms",
          metricValue: Date.now() - started,
          ok: true,
          details: { queueId: (job as any).id },
        });
        if (Date.now() - started > 3000) {
          await this.raiseAlert({
            projectId: (job as any).project_id,
            alertType: "recalculation_latency_slo_breach",
            severity: "warning",
            message: "Reconciliation/recalculation latency exceeded 3 second target.",
            context: { queueId: (job as any).id, latencyMs: Date.now() - started },
          });
        }
        results.push({ id: (job as any).id, ok: true });
      } catch (error: any) {
        const attempts = Number((job as any).attempts ?? 0) + 1;
        const waitMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
        const nextRetry = new Date(Date.now() + waitMinutes * 60_000).toISOString();
        const status = attempts >= 5 ? "failed" : "retry";
        await this.admin
          .from("runtime_reconciliation_queue")
          .update({
            status,
            attempts,
            last_error: error?.message ?? "Unknown reconciliation error",
            next_retry_at: nextRetry,
          })
          .eq("id", (job as any).id);

        await this.recordMetric({
          projectId: (job as any).project_id,
          metricName: "runtime_reconciliation_latency_ms",
          metricValue: Date.now() - started,
          ok: false,
          details: { queueId: (job as any).id, attempts },
        });

        await this.raiseAlert({
          projectId: (job as any).project_id,
          alertType: "runtime_reconciliation_failure",
          severity: attempts >= 3 ? "critical" : "warning",
          message: `Reconciliation failed (${attempts} attempts).`,
          context: { queueId: (job as any).id, error: error?.message ?? "unknown" },
        });
        results.push({ id: (job as any).id, ok: false, error: error?.message ?? "Unknown error" });
      }
    }

    return {
      processed: results.length,
      ok: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results,
    };
  }
}

export const runtimeGovernanceService = new RuntimeGovernanceService();
