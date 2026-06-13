"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceTraceabilityEngine = exports.EvidenceTraceabilityEngine = void 0;
class EvidenceTraceabilityEngine {
    constructor() {
        this.traces = new Map();
    }
    registerTraces(requestId, traces) {
        this.traces.set(requestId, traces);
    }
    getTraces(requestId) {
        return this.traces.get(requestId);
    }
    explainRecommendation(requestId, statement) {
        const requestTraces = this.traces.get(requestId);
        if (!requestTraces)
            return undefined;
        return requestTraces.find(t => t.statement.includes(statement) || statement.includes(t.statement));
    }
    getSupportingEvidence(requestId, statement) {
        const trace = this.explainRecommendation(requestId, statement);
        if (!trace)
            return [];
        return [trace.sourceEvidence];
    }
    getSourceDocument(requestId, statement) {
        const trace = this.explainRecommendation(requestId, statement);
        return trace === null || trace === void 0 ? void 0 : trace.sourceDocument;
    }
}
exports.EvidenceTraceabilityEngine = EvidenceTraceabilityEngine;
exports.evidenceTraceabilityEngine = new EvidenceTraceabilityEngine();
