export class EvidenceGraphEngine {
  buildGraph(document: any, credits: any[]) {
    // Finds the relationship between the document and credits
    const matchedCredits = credits.filter(c => document.doc_category === c.credit_code || document.credit_id === c.id);
    
    return {
      document: document.file_name,
      inferredEvidence: document.doc_category,
      mappedCredits: matchedCredits.map(c => ({
        creditCode: c.credit_code,
        points: c.points || 1,
        requirement: c.what_to_submit || "Standard requirement"
      }))
    };
  }

  generateContextString(document: any, credits: any[]): string {
    if (!document) return "";
    
    const graph = this.buildGraph(document, credits);
    
    let str = `\n[EVIDENCE GRAPH ENGINE]\nActive Document: ${graph.document}\nInferred Evidence Type: ${graph.inferredEvidence}\nMapped Credits:\n`;
    
    if (graph.mappedCredits.length === 0) {
      str += "- No direct credits mapped yet.\n";
    } else {
      graph.mappedCredits.forEach(c => {
        str += `- ${c.creditCode} (${c.points} pts): Requires ${c.requirement}\n`;
      });
    }
    
    return str;
  }
}

export const evidenceGraphEngine = new EvidenceGraphEngine();
