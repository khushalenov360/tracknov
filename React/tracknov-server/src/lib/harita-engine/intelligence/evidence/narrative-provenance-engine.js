"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.narrativeProvenanceEngine = exports.NarrativeProvenanceEngine = void 0;
class NarrativeProvenanceEngine {
    constructor() {
        this.provenanceMap = new Map();
    }
    recordProvenance(provenance) {
        this.provenanceMap.set(provenance.paragraphId, provenance);
    }
    getProvenanceByParagraph(paragraphId) {
        return this.provenanceMap.get(paragraphId);
    }
    getProvenanceByNarrative(narrativeId) {
        return Array.from(this.provenanceMap.values()).filter(p => p.narrativeId === narrativeId);
    }
    answerProvenanceQuery(query, activeNarrativeId) {
        if (!activeNarrativeId) {
            const docs = new Set();
            this.provenanceMap.forEach(p => p.sourceDocuments.forEach(d => docs.add(d)));
            return Array.from(docs);
        }
        const paragraphs = this.getProvenanceByNarrative(activeNarrativeId);
        const docs = new Set();
        paragraphs.forEach(p => p.sourceDocuments.forEach(d => docs.add(d)));
        return Array.from(docs);
    }
}
exports.NarrativeProvenanceEngine = NarrativeProvenanceEngine;
exports.narrativeProvenanceEngine = new NarrativeProvenanceEngine();
