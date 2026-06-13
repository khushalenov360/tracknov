"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingGovernor = void 0;
const entity_validator_1 = require("./entity-validator");
class RoutingGovernor {
    static validateIntent(question) {
        const q = question.toLowerCase();
        if (q.includes("ready to submit") || q.includes("can we submit") || q.includes("be submitted"))
            return "SUBMISSION_READINESS";
        if (q.includes("upload") || q.startsWith("upload this"))
            return "UPLOAD_MAPPING";
        if (q.includes("draft a narrative") || q.includes("write a narrative"))
            return "NARRATIVE_ASSISTANCE";
        if (q.includes("which statements") || q.includes("evidence") || q.includes("provenance"))
            return "PROVENANCE_QUERY";
        if (q.includes("allocate resources") || q.includes("where should resources be"))
            return "RESOURCE_ALLOCATION";
        if (q.includes("certification strategy") || q.includes("target score"))
            return "CERTIFICATION_STRATEGY";
        return "KNOWLEDGE_RETRIEVAL";
    }
    static getEngineForIntent(intent) {
        switch (intent) {
            case "SUBMISSION_READINESS": return "submission-readiness-engine";
            case "UPLOAD_MAPPING": return "upload-copilot";
            case "NARRATIVE_ASSISTANCE": return "narrative-engine";
            case "PROVENANCE_QUERY": return "provenance-engine";
            case "RESOURCE_ALLOCATION": return "executive-resource-engine";
            case "CERTIFICATION_STRATEGY": return "certification-strategy-engine";
            default: return "knowledge-engine";
        }
    }
    static validateRoute(intent, engine) {
        const expectedEngine = this.getEngineForIntent(intent);
        if (engine !== expectedEngine) {
            throw new entity_validator_1.RoutingViolation(`Route mismatch: Intent ${intent} mapped to ${engine} instead of ${expectedEngine}`);
        }
    }
    static extractCreditCode(question) {
        // Regex to match typical credit codes like "XYZ C999" or "EDA C1"
        const match = question.match(/\b([A-Z]{2,3}\s+[A-Z]\d{1,3})\b/i);
        return match ? match[1] : undefined;
    }
    static routeQuestion(question) {
        const intent = this.validateIntent(question);
        const selectedEngine = this.getEngineForIntent(intent);
        // Explicit Entity Validation
        const creditCode = this.extractCreditCode(question);
        if (creditCode) {
            entity_validator_1.EntityValidator.validateCreditCode(creditCode);
        }
        // Route Validation
        this.validateRoute(intent, selectedEngine);
        const log = {
            question,
            intent,
            confidence: 1.0,
            selectedEngine,
            timestamp: Date.now()
        };
        this.logs.push(log);
        return selectedEngine;
    }
    static getLogs() {
        return this.logs;
    }
}
exports.RoutingGovernor = RoutingGovernor;
RoutingGovernor.logs = [];
