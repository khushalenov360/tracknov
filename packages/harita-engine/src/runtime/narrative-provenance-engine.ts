export interface ParagraphProvenance {
  paragraphId: string;
  narrativeId: string;
  sourceDocuments: string[];
  sourceEvidence: string[];
  sourceCriteria: string[];
}

export class NarrativeProvenanceEngine {
  private provenanceMap: Map<string, ParagraphProvenance[]> = new Map();

  /**
   * Register the provenance of a newly generated narrative.
   */
  public registerProvenance(narrativeId: string, provenance: ParagraphProvenance[]) {
    this.provenanceMap.set(narrativeId, provenance);
  }

  /**
   * Retrieve the provenance for a given narrative.
   */
  public getProvenance(narrativeId: string): ParagraphProvenance[] | undefined {
    return this.provenanceMap.get(narrativeId);
  }

  /**
   * Aggregate all unique source documents used in a narrative.
   */
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
}

export const narrativeProvenanceEngine = new NarrativeProvenanceEngine();
