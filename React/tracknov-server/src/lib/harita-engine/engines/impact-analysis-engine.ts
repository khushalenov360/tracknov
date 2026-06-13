export interface MissingDocumentImpact {
  documentName: string;
  creditCode: string;
  impactScore: number;
  readinessGain: number;
  certificationImpact: number;
  dependencyWeight: number;
  reviewRisk: number;
}

export class ImpactAnalysisEngine {
  /**
   * Scores missing documents to find the highest impact action.
   */
  public static calculateImpact(
    missingDocuments: { documentName: string; creditCode: string; isCritical: boolean; creditPoints: number }[]
  ): MissingDocumentImpact[] {
    const scoredDocs = missingDocuments.map(doc => {
      // Mock calculations based on available metadata
      const readinessGain = doc.isCritical ? 100 : 50; // Critical docs prevent submission entirely
      const certificationImpact = Math.min(100, doc.creditPoints * 10); // Higher points = higher impact
      const dependencyWeight = 50; // Constant for now unless we have a dependency graph
      const reviewRisk = doc.isCritical ? 80 : 30; // Critical missing docs pose high review risk

      const impactScore = (readinessGain * 0.4) + (certificationImpact * 0.3) + (dependencyWeight * 0.2) + (reviewRisk * 0.1);

      return {
        documentName: doc.documentName,
        creditCode: doc.creditCode,
        impactScore: Math.round(impactScore),
        readinessGain,
        certificationImpact,
        dependencyWeight,
        reviewRisk
      };
    });

    // Sort descending by impact score
    return scoredDocs.sort((a, b) => b.impactScore - a.impactScore);
  }

  public static getHighestImpactDocument(
    missingDocuments: { documentName: string; creditCode: string; isCritical: boolean; creditPoints: number }[]
  ): MissingDocumentImpact | null {
    const scored = this.calculateImpact(missingDocuments);
    return scored.length > 0 ? scored[0] : null;
  }
}
