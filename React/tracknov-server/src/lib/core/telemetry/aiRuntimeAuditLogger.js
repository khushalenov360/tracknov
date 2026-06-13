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
exports.logAiRecommendation = logAiRecommendation;
exports.logAiRiskReport = logAiRiskReport;
const admin_1 = require("@/lib/supabase/admin");
const governanceContext_1 = require("@/lib/harita-engine/governance/governanceContext");
/**
 * TRACKNOV AI RUNTIME AUDIT LOGGER
 *
 * Ensures all AI interactions are recorded in an immutable ledger
 * with full causality tracing.
 */
function logAiRecommendation(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        const context = governanceContext_1.governanceLocalStorage.getStore();
        const traceId = (context === null || context === void 0 ? void 0 : context.traceId) || crypto.randomUUID();
        const causalityChainId = (context === null || context === void 0 ? void 0 : context.causalityChainId) || traceId;
        const actorId = context === null || context === void 0 ? void 0 : context.actorId;
        const frameworkVersion = (context === null || context === void 0 ? void 0 : context.frameworkVersion) || "UNKNOWN";
        const replayMode = (context === null || context === void 0 ? void 0 : context.replayMode) || false;
        if (replayMode) {
            console.log(`[AI_REPLAY_ISOLATION] Skipping DB audit log during replay mode. Trace: ${traceId}`);
            return { traceId, causalityChainId };
        }
        const { error } = yield admin.from("ai_recommendation_logs").insert({
            project_id: params.projectId,
            actor_id: actorId,
            recommendation_type: params.recommendationType,
            payload: params.payload,
            reasoning: params.reasoning,
            trace_id: traceId,
            causality_chain_id: causalityChainId,
            framework_version: frameworkVersion
        });
        if (error) {
            console.error(`[AI_AUDIT_FAILURE] Failed to log AI recommendation:`, error.message);
            // In a high-integrity system, we might throw here to block the non-audited action
            throw new Error(`AI_AUDIT_INTEGRITY_VIOLATION: ${error.message}`);
        }
        return { traceId, causalityChainId };
    });
}
function logAiRiskReport(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        const context = governanceContext_1.governanceLocalStorage.getStore();
        const traceId = (context === null || context === void 0 ? void 0 : context.traceId) || crypto.randomUUID();
        const causalityChainId = (context === null || context === void 0 ? void 0 : context.causalityChainId) || traceId;
        const replayMode = (context === null || context === void 0 ? void 0 : context.replayMode) || false;
        if (replayMode) {
            console.log(`[AI_REPLAY_ISOLATION] Skipping risk report mutation during replay mode. Trace: ${traceId}`);
            return;
        }
        const { error } = yield admin.from("ai_execution_risk_reports").insert({
            project_id: params.projectId,
            risk_score: params.riskScore,
            risk_factors: params.riskFactors,
            mitigation_recommendations: params.mitigationRecommendations,
            trace_id: traceId,
            causality_chain_id: causalityChainId
        });
        if (error) {
            throw new Error(`AI_AUDIT_INTEGRITY_VIOLATION: ${error.message}`);
        }
    });
}
