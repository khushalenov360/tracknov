"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const narrative_provenance_engine_1 = require("../runtime/narrative-provenance-engine");
(0, vitest_1.describe)('Narrative Provenance Engine', () => {
    (0, vitest_1.it)('should correctly store and retrieve paragraph provenance', () => {
        const provenance = [
            {
                paragraphId: "p1",
                narrativeId: "narrative-123",
                generatedText: "Project complies by achieving 15% savings.",
                sourceDocuments: ["doc1.pdf"],
                sourceEvidence: ["Table 4 showing 15% savings"],
                sourceCriteria: ["Energy Efficiency Clause 1"]
            }
        ];
        narrative_provenance_engine_1.narrativeProvenanceEngine.registerProvenance("narrative-123", provenance);
        const docs = narrative_provenance_engine_1.narrativeProvenanceEngine.getSourceDocuments("narrative-123");
        (0, vitest_1.expect)(docs).toContain("doc1.pdf");
        const traceability = narrative_provenance_engine_1.narrativeProvenanceEngine.getEvidenceTraceability("narrative-123");
        (0, vitest_1.expect)(traceability[0].evidence).toContain("Table 4 showing 15% savings");
    });
});
