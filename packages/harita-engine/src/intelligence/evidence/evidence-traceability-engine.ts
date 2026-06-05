export interface EvidenceTrace {
  statement: string;
  sourceDocument: string;
  sourceEvidence: string;
  confidence: number;
}

export class EvidenceTraceabilityEngine {
  private traces: EvidenceTrace[] = [];

  recordTrace(trace: EvidenceTrace) {
    this.traces.push(trace);
  }

  getTracesByStatement(statementSnippet: string): EvidenceTrace[] {
    const lower = statementSnippet.toLowerCase();
    return this.traces.filter(t => t.statement.toLowerCase().includes(lower));
  }

  getTracesByDocument(documentName: string): EvidenceTrace[] {
    const lower = documentName.toLowerCase();
    return this.traces.filter(t => t.sourceDocument.toLowerCase().includes(lower));
  }

  getAllTraces() {
    return this.traces;
  }
}

export const evidenceTraceabilityEngine = new EvidenceTraceabilityEngine();
