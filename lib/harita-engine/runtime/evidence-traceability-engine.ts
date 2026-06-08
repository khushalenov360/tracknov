export interface EvidenceTrace {
  statement: string;
  sourceDocument: string;
  sourceEvidence: string;
  sourceCriteria: string;
  confidence: number;
}

export class EvidenceTraceabilityEngine {
  private traces: Map<string, EvidenceTrace[]> = new Map();

  public registerTraces(requestId: string, traces: EvidenceTrace[]) {
    this.traces.set(requestId, traces);
  }

  public getTraces(requestId: string): EvidenceTrace[] | undefined {
    return this.traces.get(requestId);
  }

  public explainRecommendation(requestId: string, statement: string): EvidenceTrace | undefined {
    const requestTraces = this.traces.get(requestId);
    if (!requestTraces) return undefined;
    return requestTraces.find(t => t.statement.includes(statement) || statement.includes(t.statement));
  }

  public getSupportingEvidence(requestId: string, statement: string): string[] {
    const trace = this.explainRecommendation(requestId, statement);
    if (!trace) return [];
    return [trace.sourceEvidence];
  }

  public getSourceDocument(requestId: string, statement: string): string | undefined {
    const trace = this.explainRecommendation(requestId, statement);
    return trace?.sourceDocument;
  }
}

export const evidenceTraceabilityEngine = new EvidenceTraceabilityEngine();
