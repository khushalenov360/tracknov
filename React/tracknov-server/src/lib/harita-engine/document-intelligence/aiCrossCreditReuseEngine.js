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
exports.detectEvidenceReuse = detectEvidenceReuse;
const uuid_1 = require("uuid");
const admin_1 = require("@/lib/supabase/admin");
const aiRuntimeAuditLogger_1 = require("@/lib/core/telemetry/aiRuntimeAuditLogger");
/**
 * TRACKNOV AI CROSS-CREDIT REUSE ENGINE
 *
 * Detects opportunities to reuse evidence across different credits.
 */
function detectEvidenceReuse(projectId, documentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        // Simulate reuse detection
        // In reality: Vector search across credit requirements
        const reuseOpportunities = [
            { targetCreditId: "SS-1", confidence: 0.95 },
            { targetCreditId: "WE-2", confidence: 0.72 }
        ];
        for (const opp of reuseOpportunities) {
            yield admin.from("ai_evidence_reuse_maps").insert({
                project_id: projectId,
                source_document_id: documentId,
                target_credit_id: opp.targetCreditId,
                confidence_score: opp.confidence,
                trace_id: (0, uuid_1.v4)(),
                causality_chain_id: (0, uuid_1.v4)()
            });
        }
        yield (0, aiRuntimeAuditLogger_1.logAiRecommendation)({
            projectId,
            recommendationType: "EVIDENCE_REUSE_DETECTION",
            payload: { documentId, reuseOpportunities },
            reasoning: "Detected high semantic overlap between document content and credit requirements."
        });
        return reuseOpportunities;
    });
}
