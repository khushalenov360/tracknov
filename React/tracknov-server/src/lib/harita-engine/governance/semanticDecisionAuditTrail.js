"use strict";
/**
 * Tracknov Knowledge Governance - Semantic Decision Audit Trail
 * Traces exact reasoning for rank score overrides and confidence calibration adjustments.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticDecisionAuditTrail = void 0;
class SemanticDecisionAuditTrail {
    static logDecision(module, originalScore, finalScore, rationale) {
        const record = {
            decisionId: `dec-${Math.random().toString(36).substr(2, 9)}`,
            module,
            originalScore,
            finalScore,
            rationale,
            timestamp: new Date().toISOString()
        };
        this.trail.push(record);
        return record;
    }
    static getTrail() {
        return this.trail;
    }
}
exports.SemanticDecisionAuditTrail = SemanticDecisionAuditTrail;
SemanticDecisionAuditTrail.trail = [];
