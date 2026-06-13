export interface ProvenanceTrace {
  statement: string;
  sourceDocument: string;
  sourceEvidence: string;
  sourceCriteria: string;
  confidence: number;
}

export class ProvenanceEngine {
  private static mockData: ProvenanceTrace[] = [
    {
      statement: "Project located in Indore",
      sourceDocument: "KFC-BHAVARKUA AREA CHART.pdf",
      sourceEvidence: "Site location coordinates and address block.",
      sourceCriteria: "General Project Information",
      confidence: 100
    }
  ];

  static evaluateEvidence(statement: string, context: any): ProvenanceTrace[] {
    // Strict traceability structure
    return this.mockData;
  }

  static getFullTraceability(): ProvenanceTrace[] {
    return this.mockData;
  }
}
