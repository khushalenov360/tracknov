"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceTraceabilityEngine = exports.EvidenceTraceabilityEngine = void 0;
class EvidenceTraceabilityEngine {
    constructor() {
        this.traces = [];
    }
    recordTrace(trace) {
        this.traces.push(trace);
    }
    getTracesByStatement(statementSnippet) {
        const lower = statementSnippet.toLowerCase();
        return this.traces.filter(t => t.statement.toLowerCase().includes(lower));
    }
    getTracesByDocument(documentName) {
        const lower = documentName.toLowerCase();
        return this.traces.filter(t => t.sourceDocument.toLowerCase().includes(lower));
    }
    getAllTraces() {
        return this.traces;
    }
    explainConclusion(statementSnippet) {
        const traces = this.getTracesByStatement(statementSnippet);
        if (traces.length === 0)
            return "No traceability data found for this statement.";
        return traces.map(t => `Statement:\n${t.statement}\n\nBecause:\n${t.sourceEvidence}\n\nSource:\n${t.sourceDocument} (Confidence: ${t.confidence}%)`).join("\n\n---\n\n");
    }
}
exports.EvidenceTraceabilityEngine = EvidenceTraceabilityEngine;
exports.evidenceTraceabilityEngine = new EvidenceTraceabilityEngine();
