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
exports.runtimeGovernanceService = exports.RuntimeGovernanceService = void 0;
const admin_1 = require("@/lib/supabase/admin");
class RuntimeGovernanceService {
    get admin() {
        return (0, admin_1.createAdminClient)();
    }
    recordMetric(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            yield this.admin.from("runtime_metrics").insert({
                project_id: (_a = payload.projectId) !== null && _a !== void 0 ? _a : null,
                metric_name: payload.metricName,
                metric_value: payload.metricValue,
                ok: (_b = payload.ok) !== null && _b !== void 0 ? _b : true,
                details: (_c = payload.details) !== null && _c !== void 0 ? _c : {},
            });
        });
    }
    raiseAlert(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            yield this.admin.from("runtime_alerts").insert({
                project_id: (_a = payload.projectId) !== null && _a !== void 0 ? _a : null,
                alert_type: payload.alertType,
                severity: (_b = payload.severity) !== null && _b !== void 0 ? _b : "warning",
                message: payload.message,
                context: (_c = payload.context) !== null && _c !== void 0 ? _c : {},
            });
        });
    }
    markStateDesync(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield this.admin.from("runtime_desync").upsert({
                project_id: params.projectId,
                entity_type: params.entityType,
                entity_id: params.entityId,
                reason: params.reason,
                status: "open",
            }, {
                onConflict: "project_id,entity_type,entity_id",
                ignoreDuplicates: false,
            });
            yield this.admin.from("runtime_reconciliation_queue").insert({
                project_id: params.projectId,
                entity_type: params.entityType,
                entity_id: params.entityId,
                reason: params.reason,
                payload: (_a = params.payload) !== null && _a !== void 0 ? _a : {},
                status: "pending",
                next_retry_at: new Date().toISOString(),
            });
            yield this.admin.rpc("recompute_project_runtime_block_state", { p_project_id: params.projectId });
            yield this.raiseAlert({
                projectId: params.projectId,
                alertType: "state_desync_open",
                severity: "critical",
                message: `STATE_DESYNC opened for ${params.entityType}.`,
                context: { entityId: params.entityId, reason: params.reason },
            });
        });
    }
    clearStateDesync(projectId, entityType, entityId) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = this.admin.from("runtime_desync").update({
                status: "resolved",
                resolved_at: new Date().toISOString(),
            }).eq("project_id", projectId).eq("status", "open");
            if (entityType)
                query = query.eq("entity_type", entityType);
            if (entityId)
                query = query.eq("entity_id", entityId);
            yield query;
            yield this.admin.rpc("recompute_project_runtime_block_state", { p_project_id: projectId });
        });
    }
    hasOpenDesync(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.admin
                .from("runtime_desync")
                .select("id", { count: "exact", head: true })
                .eq("project_id", projectId)
                .eq("status", "open");
            if (error)
                return false;
            return Boolean(data) || false;
        });
    }
    getDesyncSummary() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { data: open } = yield this.admin
                .from("runtime_desync")
                .select("project_id, entity_type, detected_at")
                .eq("status", "open");
            const { data: queue } = yield this.admin
                .from("runtime_reconciliation_queue")
                .select("status")
                .in("status", ["pending", "retry"]);
            const byProject = new Map();
            for (const row of open !== null && open !== void 0 ? open : []) {
                const key = String((_a = row.project_id) !== null && _a !== void 0 ? _a : "");
                if (!key)
                    continue;
                byProject.set(key, ((_b = byProject.get(key)) !== null && _b !== void 0 ? _b : 0) + 1);
            }
            return {
                openDesyncCount: (open !== null && open !== void 0 ? open : []).length,
                queuedRepairs: (queue !== null && queue !== void 0 ? queue : []).length,
                projectsImpacted: byProject.size,
            };
        });
    }
    runReconciliationBatch() {
        return __awaiter(this, arguments, void 0, function* (limit = 25) {
            var _a, _b, _c, _d;
            const nowIso = new Date().toISOString();
            const { data: jobs } = yield this.admin
                .from("runtime_reconciliation_queue")
                .select("id, project_id, entity_type, entity_id, attempts")
                .in("status", ["pending", "retry"])
                .lte("next_retry_at", nowIso)
                .order("created_at", { ascending: true })
                .limit(limit);
            const results = [];
            for (const job of jobs !== null && jobs !== void 0 ? jobs : []) {
                const started = Date.now();
                try {
                    yield this.admin.from("runtime_reconciliation_queue").update({ status: "processing" }).eq("id", job.id);
                    yield this.admin.rpc("recompute_credit_scores", { p_project_id: job.project_id });
                    yield this.admin.rpc("get_project_certification_summary", { p_project_id: job.project_id });
                    yield this.admin
                        .from("runtime_reconciliation_queue")
                        .update({ status: "completed", updated_at: new Date().toISOString() })
                        .eq("id", job.id);
                    yield this.clearStateDesync(job.project_id, job.entity_type, job.entity_id);
                    yield this.recordMetric({
                        projectId: job.project_id,
                        metricName: "runtime_reconciliation_latency_ms",
                        metricValue: Date.now() - started,
                        ok: true,
                        details: { queueId: job.id },
                    });
                    if (Date.now() - started > 3000) {
                        yield this.raiseAlert({
                            projectId: job.project_id,
                            alertType: "recalculation_latency_slo_breach",
                            severity: "warning",
                            message: "Reconciliation/recalculation latency exceeded 3 second target.",
                            context: { queueId: job.id, latencyMs: Date.now() - started },
                        });
                    }
                    results.push({ id: job.id, ok: true });
                }
                catch (error) {
                    const attempts = Number((_a = job.attempts) !== null && _a !== void 0 ? _a : 0) + 1;
                    const waitMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
                    const nextRetry = new Date(Date.now() + waitMinutes * 60000).toISOString();
                    const status = attempts >= 5 ? "failed" : "retry";
                    yield this.admin
                        .from("runtime_reconciliation_queue")
                        .update({
                        status,
                        attempts,
                        last_error: (_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : "Unknown reconciliation error",
                        next_retry_at: nextRetry,
                    })
                        .eq("id", job.id);
                    yield this.recordMetric({
                        projectId: job.project_id,
                        metricName: "runtime_reconciliation_latency_ms",
                        metricValue: Date.now() - started,
                        ok: false,
                        details: { queueId: job.id, attempts },
                    });
                    yield this.raiseAlert({
                        projectId: job.project_id,
                        alertType: "runtime_reconciliation_failure",
                        severity: attempts >= 3 ? "critical" : "warning",
                        message: `Reconciliation failed (${attempts} attempts).`,
                        context: { queueId: job.id, error: (_c = error === null || error === void 0 ? void 0 : error.message) !== null && _c !== void 0 ? _c : "unknown" },
                    });
                    results.push({ id: job.id, ok: false, error: (_d = error === null || error === void 0 ? void 0 : error.message) !== null && _d !== void 0 ? _d : "Unknown error" });
                }
            }
            return {
                processed: results.length,
                ok: results.filter((item) => item.ok).length,
                failed: results.filter((item) => !item.ok).length,
                results,
            };
        });
    }
}
exports.RuntimeGovernanceService = RuntimeGovernanceService;
exports.runtimeGovernanceService = new RuntimeGovernanceService();
