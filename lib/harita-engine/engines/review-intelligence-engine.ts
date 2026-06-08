import { RuntimeContext, DocumentRow } from "../lib/runtime/runtime-context-assembler";

export class ReviewIntelligenceEngine {
  public static simulateAssessorReview(documentId: string, context: RuntimeContext) {
    const doc = context.documents.find(d => d.id === documentId);
    if (!doc) throw new Error("Document not found");

    const intelligence = context.documentIntelligence.find(i => i.document_id === documentId);
    if (!intelligence) return { recommendation: "CLARIFICATION_NEEDED", reason: "Missing semantic intelligence" };

    const score = intelligence.relevance_score || 0;
    
    if (score > 85 && (!intelligence.risks || intelligence.risks.length === 0)) {
      return { recommendation: "APPROVED", reason: "Document meets IGBC criteria fully." };
    } else if (score < 40) {
      return { recommendation: "REJECTED", reason: "Document is irrelevant or missing critical narrative." };
    } else {
      return { recommendation: "CLARIFICATION_NEEDED", reason: "Document has partial compliance but flagged risks." };
    }
  }
}
