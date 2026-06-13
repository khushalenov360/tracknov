"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.narrativeProvenanceEngine = exports.NarrativeProvenanceEngine = void 0;
class NarrativeProvenanceEngine {
    constructor() {
        this.provenanceMap = new Map();
    }
    registerProvenance(narrativeId, provenance) {
        this.provenanceMap.set(narrativeId, provenance);
    }
    getProvenance(narrativeId) {
        return this.provenanceMap.get(narrativeId);
    }
    getSourceDocuments(narrativeId) {
        const provenance = this.getProvenance(narrativeId) || [];
        const docs = new Set();
        for (const p of provenance) {
            for (const doc of p.sourceDocuments) {
                docs.add(doc);
            }
        }
        return Array.from(docs);
    }
    getEvidenceTraceability(narrativeId) {
        const provenance = this.getProvenance(narrativeId) || [];
        return provenance.map(p => ({
            generatedText: p.generatedText,
            evidence: p.sourceEvidence
        }));
    }
    getCriteriaTraceability(narrativeId) {
        const provenance = this.getProvenance(narrativeId) || [];
        return provenance.map(p => ({
            generatedText: p.generatedText,
            criteria: p.sourceCriteria
        }));
    }
    getStatementsFromEvidence(narrativeId) {
        const provenance = this.getProvenance(narrativeId) || [];
        return provenance.filter(p => p.sourceDocuments.length > 0 || p.sourceEvidence.length > 0)
            .map(p => ({ generatedText: p.generatedText }));
    }
}
exports.NarrativeProvenanceEngine = NarrativeProvenanceEngine;
exports.narrativeProvenanceEngine = new NarrativeProvenanceEngine();
