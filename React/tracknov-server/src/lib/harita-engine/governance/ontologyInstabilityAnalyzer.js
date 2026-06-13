"use strict";
/**
 * Tracknov Knowledge Governance - Ontology Instability Analyzer
 * Ranks taxonomy nodes based on override frequencies to flag unstable definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OntologyInstabilityAnalyzer = void 0;
class OntologyInstabilityAnalyzer {
    /**
     * Analyzes Concept usage volatility from override logs.
     */
    static analyzeConcept(conceptCode, overrideCount, totalIngested) {
        if (totalIngested === 0) {
            return { conceptCode, overrideCount: 0, instabilityIndex: 0, reconciliationProposed: false };
        }
        const ratio = overrideCount / totalIngested;
        const instabilityIndex = Math.min(ratio * 2.0, 1.0); // weighted index scale
        const reconciliationProposed = instabilityIndex > 0.6;
        return {
            conceptCode,
            overrideCount,
            instabilityIndex,
            reconciliationProposed
        };
    }
}
exports.OntologyInstabilityAnalyzer = OntologyInstabilityAnalyzer;
