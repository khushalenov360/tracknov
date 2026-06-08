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

  explainConclusion(statementSnippet: string): string {
    const traces = this.getTracesByStatement(statementSnippet);
    if (traces.length === 0) return "No traceability data found for this statement.";

    return traces.map(t => 
      `Statement:\n${t.statement}\n\nBecause:\n${t.sourceEvidence}\n\nSource:\n${t.sourceDocument} (Confidence: ${t.confidence}%)`
    ).join("\n\n---\n\n");
  }
}

export const evidenceTraceabilityEngine = new EvidenceTraceabilityEngine();
