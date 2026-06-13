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
exports.recommendEvidence = recommendEvidence;
const aiRuntimeAuditLogger_1 = require("@/lib/core/telemetry/aiRuntimeAuditLogger");
const aiGovernanceBoundary_1 = require("../governance/aiGovernanceBoundary");
const aiPromptContextBuilder_1 = require("../../document-intelligence/aiPromptContextBuilder");
/**
 * TRACKNOV AI EVIDENCE RECOMMENDATION ENGINE
 *
 * Recommends submittals/evidence based on credit requirements.
 */
function recommendEvidence(projectId, actorId, creditId) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Build context
        const context = yield (0, aiPromptContextBuilder_1.buildPromptContext)(projectId, actorId);
        // 2. Simulate AI Analysis (In production, this calls LLM)
        // Logic: Map project artifacts to credit requirements
        const recommendation = {
            creditId,
            suggestedDocuments: ["site-plan-v1.pdf", "landscape-calc-rev2.xlsx"],
            confidence: 0.89,
            reasoning: "Documents match framework requirements for high-reflectance materials."
        };
        // 3. Enforce Governance Boundary
        aiGovernanceBoundary_1.AiGovernanceBoundary.validateRecommendation("RECOMMEND_EVIDENCE", recommendation);
        // 4. Log Immutable Audit Trace
        yield (0, aiRuntimeAuditLogger_1.logAiRecommendation)({
            projectId,
            recommendationType: "EVIDENCE_RECOMMENDATION",
            payload: recommendation,
            reasoning: recommendation.reasoning
        });
        return recommendation;
    });
}
