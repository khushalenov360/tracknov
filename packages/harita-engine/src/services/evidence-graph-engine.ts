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

  getToolSchema() {
    return {
      name: "evaluateEvidence",
      description: "Use this tool to semantically evaluate if a document meets a credit requirement. This runs an isolated cognitive loop to score the evidence.",
      parameters: {
        type: "OBJECT",
        properties: {
          documentSummary: {
            type: "STRING",
            description: "The summary of the document's contents."
          },
          creditRequirement: {
            type: "STRING",
            description: "The detailed requirement of the credit."
          }
        },
        required: ["documentSummary", "creditRequirement"]
      }
    };
  }

  async evaluateEvidenceWithAI(documentSummary: string, creditRequirement: string, apiKey: string): Promise<{ confidenceScore: number, reasoning: string }> {
    const systemPrompt = `You are the Tracknov Evidence Graph Engine.
Evaluate the document summary against the credit requirement.
Return a JSON object with two fields:
- confidenceScore (number 0-100): How likely is it that the document satisfies the requirement.
- reasoning (string): Brief justification.`;

    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: `Document Summary: ${documentSummary}\nCredit Requirement: ${creditRequirement}` }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) return { confidenceScore: 0, reasoning: "Evaluation failed" };
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return JSON.parse(text);
      }
    } catch {
       // fallback
    }
    return { confidenceScore: 0, reasoning: "Failed to parse AI response" };
  }
}

export const evidenceGraphEngine = new EvidenceGraphEngine();
