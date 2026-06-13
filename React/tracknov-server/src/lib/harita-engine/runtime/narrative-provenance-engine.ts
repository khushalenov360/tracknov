export interface ParagraphProvenance {
  paragraphId: string;
  narrativeId: string;
  generatedText: string;
  sourceDocuments: string[];
  sourceEvidence: string[];
  sourceCriteria: string[];
}

export class NarrativeProvenanceEngine {
  private provenanceMap: Map<string, ParagraphProvenance[]> = new Map();

  public registerProvenance(narrativeId: string, provenance: ParagraphProvenance[]) {
    this.provenanceMap.set(narrativeId, provenance);
  }

  public getProvenance(narrativeId: string): ParagraphProvenance[] | undefined {
    return this.provenanceMap.get(narrativeId);
  }

  public getSourceDocuments(narrativeId: string): string[] {
    const provenance = this.getProvenance(narrativeId) || [];
    const docs = new Set<string>();
    for (const p of provenance) {
      for (const doc of p.sourceDocuments) {
        docs.add(doc);
      }
    }
    return Array.from(docs);
  }

  public getEvidenceTraceability(narrativeId: string): Array<{ generatedText: string, evidence: string[] }> {
    const provenance = this.getProvenance(narrativeId) || [];
    return provenance.map(p => ({
      generatedText: p.generatedText,
      evidence: p.sourceEvidence
    }));
  }

  public getCriteriaTraceability(narrativeId: string): Array<{ generatedText: string, criteria: string[] }> {
    const provenance = this.getProvenance(narrativeId) || [];
    return provenance.map(p => ({
      generatedText: p.generatedText,
      criteria: p.sourceCriteria
    }));
  }

  public getStatementsFromEvidence(narrativeId: string): Array<{ generatedText: string }> {
    const provenance = this.getProvenance(narrativeId) || [];
    return provenance.filter(p => p.sourceDocuments.length > 0 || p.sourceEvidence.length > 0)
      .map(p => ({ generatedText: p.generatedText }));
  }
}

export const narrativeProvenanceEngine = new NarrativeProvenanceEngine();
