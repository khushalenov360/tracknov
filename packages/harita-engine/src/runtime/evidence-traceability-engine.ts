export interface EvidenceTrace {
  statement: string;
  sourceDocument: string;
  sourceEvidence: string;
  confidence: number;
}

export class EvidenceTraceabilityEngine {
  private traces: Map<string, EvidenceTrace[]> = new Map();

  /**
   * Register a set of evidence traces for a specific task or request ID.
   */
  public registerTraces(requestId: string, traces: EvidenceTrace[]) {
    this.traces.set(requestId, traces);
  }

  /**
   * Retrieve traces by request ID.
   */
  public getTraces(requestId: string): EvidenceTrace[] | undefined {
    return this.traces.get(requestId);
  }
}

export const evidenceTraceabilityEngine = new EvidenceTraceabilityEngine();
