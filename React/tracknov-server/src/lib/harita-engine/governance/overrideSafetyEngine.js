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
exports.validateOverrideSafety = validateOverrideSafety;
exports.confirmOverride = confirmOverride;
const admin_1 = require("@/lib/supabase/admin");
const governanceContext_1 = require("./governanceContext");
const impactGraphEngine_1 = require("./impactGraphEngine");
const replayEngine_1 = require("../replay/replayEngine");
/**
 * Override Safety Framework.
 * Enforces mandatory safety checks before any governance override is committed.
 */
function validateOverrideSafety(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        const context = governanceContext_1.governanceLocalStorage.getStore();
        // 1. Mandatory Reason Check
        if (!params.reason || params.reason.length < 20) {
            throw new Error("Override safety violation: Detailed reason (min 20 chars) is required.");
        }
        // 2. Blast-Radius Calculation
        // We simulate the graph nodes for this example, but in production, this would fetch from the dependency resolver
        const blastRadius = (0, impactGraphEngine_1.calculateGovernanceImpactBlastRadius)("OVERRIDE_TARGET", []);
        // 3. Replay Impact Validation
        // We run a test replay to ensure the override doesn't break the deterministic history
        const replayResult = yield (0, replayEngine_1.executeDeterministicReplay)(params.projectId, params.targetTimestamp);
        const replayDriftDetected = Object.keys(replayResult.reconstructedState.integrityValidation).length > 0;
        // 4. Create immutable safety report
        const { data: report, error } = yield admin
            .from("override_safety_reports")
            .insert({
            project_id: params.projectId,
            override_type: params.overrideType,
            reason: params.reason,
            actor_id: params.actorId,
            blast_radius: blastRadius,
            replay_impact_validation: {
                driftDetected: replayDriftDetected,
                executedAt: replayResult.executedAt,
                contract: replayResult.contract.replayVersion
            }
        })
            .select("report_id")
            .single();
        if (error) {
            throw new Error(`Failed to persist override safety report: ${error.message}`);
        }
        return {
            reportId: report.report_id,
            isSafe: !replayDriftDetected && !blastRadius.downgradeRequired,
            blastRadius,
            replayDriftDetected,
            validationWarnings: blastRadius.downgradeRequired ? ["Certification downgrade required"] : []
        };
    });
}
function confirmOverride(reportId, confirmorId) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        const { error } = yield admin
            .from("override_safety_reports")
            .update({
            secondary_confirmation_by: confirmorId,
            secondary_confirmation_at: new Date().toISOString()
        })
            .eq("report_id", reportId);
        if (error) {
            throw new Error(`Failed to confirm override: ${error.message}`);
        }
    });
}
