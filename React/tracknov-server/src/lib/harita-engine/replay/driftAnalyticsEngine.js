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
exports.generateDriftAnalyticsReport = generateDriftAnalyticsReport;
const admin_1 = require("@/lib/supabase/admin");
/**
 * Long-Duration Drift Analytics Engine.
 * Analyzes historical drift patterns to identify recurring governance vulnerabilities.
 */
function generateDriftAnalyticsReport(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        // 1. Fetch historical drift events from the reconciliation_items table
        const { data: reconciliationItems } = yield admin
            .from("reconciliation_items")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false });
        // 2. Calculate recurring items (reconciled multiple times)
        const recurrenceMap = {};
        reconciliationItems === null || reconciliationItems === void 0 ? void 0 : reconciliationItems.forEach(item => {
            const key = `${item.target_table}:${item.target_id}`;
            recurrenceMap[key] = (recurrenceMap[key] || 0) + 1;
        });
        const recurringReconciliationItems = Object.entries(recurrenceMap)
            .filter(([_, count]) => count > 1)
            .map(([key, count]) => ({ key, count }));
        // 3. Stale-state heatmap (where is drift happening most?)
        const staleStateHeatmap = {};
        reconciliationItems === null || reconciliationItems === void 0 ? void 0 : reconciliationItems.forEach(item => {
            staleStateHeatmap[item.target_table] = (staleStateHeatmap[item.target_table] || 0) + 1;
        });
        // 4. Unresolved drift aging
        const { data: unresolvedItems } = yield admin
            .from("reconciliation_items")
            .select("*")
            .eq("project_id", projectId)
            .eq("status", "pending")
            .order("created_at", { ascending: true });
        const unresolvedDriftAging = (unresolvedItems === null || unresolvedItems === void 0 ? void 0 : unresolvedItems.map(item => ({
            id: item.id,
            ageSeconds: (Date.now() - new Date(item.created_at).getTime()) / 1000,
            table: item.target_table
        }))) || [];
        const report = {
            driftTrendHistory: [], // Would aggregate over time in a real system
            recurringReconciliationItems,
            staleStateHeatmap,
            unresolvedDriftAging
        };
        // Persist report
        yield admin.from("drift_analytics_reports").insert({
            project_id: projectId,
            drift_trend_history: [],
            recurring_reconciliation_items: recurringReconciliationItems,
            stale_state_heatmap: staleStateHeatmap,
            unresolved_drift_aging: unresolvedDriftAging
        });
        return report;
    });
}
