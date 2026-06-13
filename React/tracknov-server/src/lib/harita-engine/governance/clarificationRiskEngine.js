"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateClarificationRisk = calculateClarificationRisk;
const governanceContext_1 = require("./governanceContext");
/**
 * Evaluates the probability of a clarification request based on evidence quality and history.
 */
function calculateClarificationRisk(evidenceMetadata, projectHistory) {
    const context = governanceContext_1.governanceLocalStorage.getStore();
    const factors = [];
    let score = 0.1; // Base risk
    // 1. Evidence Quality Factors
    if (!evidenceMetadata.doc_category) {
        score += 0.3;
        factors.push("MISSING_CLASSIFICATION");
    }
    if (evidenceMetadata.rejection_count > 0) {
        score += 0.2 * evidenceMetadata.rejection_count;
        factors.push(`PREVIOUS_REJECTIONS_${evidenceMetadata.rejection_count}`);
    }
    // 2. Ambiguity Detection (Placeholder for real logic)
    if (evidenceMetadata.notes && evidenceMetadata.notes.length < 10) {
        score += 0.1;
        factors.push("INSUFFICIENT_CONTEXT");
    }
    // 3. Framework specific escalation
    if ((context === null || context === void 0 ? void 0 : context.frameworkVersion) === "GI_V2") {
        if (!evidenceMetadata.file_hash) {
            score += 0.4;
            factors.push("GI_V2_INTEGRITY_RISK");
        }
    }
    // Cap score at 1.0
    score = Math.min(score, 1.0);
    let riskLevel = "LOW";
    if (score > 0.8)
        riskLevel = "CRITICAL";
    else if (score > 0.5)
        riskLevel = "HIGH";
    else if (score > 0.2)
        riskLevel = "MEDIUM";
    return {
        probability: score,
        riskLevel,
        factors,
    };
}
