export interface ParagraphProvenance {
  paragraphId: string;
  narrativeId: string;
  sourceDocuments: string[];
  sourceEvidence: string[];
  sourceCriteria: string[];
}

export class NarrativeProvenanceEngine {
  private provenanceMap: Map<string, ParagraphProvenance> = new Map();

  recordProvenance(provenance: ParagraphProvenance) {
    this.provenanceMap.set(provenance.paragraphId, provenance);
  }

  getProvenanceByParagraph(paragraphId: string): ParagraphProvenance | undefined {
    return this.provenanceMap.get(paragraphId);
  }

  getProvenanceByNarrative(narrativeId: string): ParagraphProvenance[] {
    return Array.from(this.provenanceMap.values()).filter(p => p.narrativeId === narrativeId);
  }

  answerProvenanceQuery(query: string, activeNarrativeId?: string): string[] {
    if (!activeNarrativeId) {
      const docs = new Set<string>();
      this.provenanceMap.forEach(p => p.sourceDocuments.forEach(d => docs.add(d)));
      return Array.from(docs);
    }
    const paragraphs = this.getProvenanceByNarrative(activeNarrativeId);
    const docs = new Set<string>();
    paragraphs.forEach(p => p.sourceDocuments.forEach(d => docs.add(d)));
    return Array.from(docs);
  }
}

export const narrativeProvenanceEngine = new NarrativeProvenanceEngine();
