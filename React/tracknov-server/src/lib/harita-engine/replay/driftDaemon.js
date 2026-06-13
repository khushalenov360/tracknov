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
exports.executeDriftReconciliationCycle = executeDriftReconciliationCycle;
const admin_1 = require("@/lib/supabase/admin");
const derivedStateEngine_1 = require("@/core/runtime/derivedStateEngine");
const governanceObservabilityBus_1 = require("../governance/governanceObservabilityBus");
const governanceMutationInterceptor_1 = require("../governance/governanceMutationInterceptor");
/**
 * Enterprise Drift Daemon (Workstream 2).
 * Proactively scans for state desynchronization and executes derived-state convergence.
 * Ensures Section 9 (Derived State Law) is upheld across all active projects.
 */
function executeDriftReconciliationCycle() {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        // 1. Identify active projects for reconciliation scan
        // We prioritize projects that are not yet sealed to detect drift during the review lifecycle.
        const { data: projects, error } = yield admin
            .from("projects")
            .select("id, name")
            .neq("certification_state", "CERTIFIED_LOCKED");
        if (error || !projects) {
            console.error("[DRIFT_DAEMON_ERROR] Failed to retrieve projects:", error);
            return;
        }
        // Execute the cycle within a governed operational boundary for traceability
        yield (0, governanceMutationInterceptor_1.runInOperationalMode)("SYSTEM", () => __awaiter(this, void 0, void 0, function* () {
            yield (0, governanceObservabilityBus_1.emitGovernanceEvent)({
                category: "DRIFT_DAEMON_CYCLE",
                severity: "info",
                sourceLayer: "DRIFT_DAEMON",
                payload: { status: "started", projectCount: projects.length }
            });
            // 2. Proactive Convergence
            // Sequentially processing to avoid DB contention while ensuring causality linkage
            for (const project of projects) {
                try {
                    yield (0, derivedStateEngine_1.recomputeDerivedState)(project.id);
                    // Audit log of successful reconciliation
                    yield (0, governanceObservabilityBus_1.emitGovernanceEvent)({
                        category: "DRIFT_RECONCILIATION",
                        severity: "info",
                        sourceLayer: "DRIFT_DAEMON",
                        projectId: project.id,
                        payload: { status: "converged", projectName: project.name }
                    });
                }
                catch (err) {
                    yield (0, governanceObservabilityBus_1.emitGovernanceEvent)({
                        category: "DRIFT_RECONCILIATION_FAILURE",
                        severity: "warning",
                        sourceLayer: "DRIFT_DAEMON",
                        projectId: project.id,
                        payload: { error: err.message }
                    });
                }
            }
            yield (0, governanceObservabilityBus_1.emitGovernanceEvent)({
                category: "DRIFT_DAEMON_CYCLE",
                severity: "info",
                sourceLayer: "DRIFT_DAEMON",
                payload: { status: "completed" }
            });
        }));
    });
}
