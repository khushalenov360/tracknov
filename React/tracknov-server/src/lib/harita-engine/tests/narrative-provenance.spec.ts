import { describe, it, expect } from 'vitest';
import { narrativeProvenanceEngine } from '../runtime/narrative-provenance-engine';

describe('Narrative Provenance Engine', () => {
  it('should correctly store and retrieve paragraph provenance', () => {
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

    narrativeProvenanceEngine.registerProvenance("narrative-123", provenance);

    const docs = narrativeProvenanceEngine.getSourceDocuments("narrative-123");
    expect(docs).toContain("doc1.pdf");

    const traceability = narrativeProvenanceEngine.getEvidenceTraceability("narrative-123");
    expect(traceability[0].evidence).toContain("Table 4 showing 15% savings");
  });
});
