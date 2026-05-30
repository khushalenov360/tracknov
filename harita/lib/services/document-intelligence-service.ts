import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export type DocumentIntelligenceResult = {
  summary: string;
  relevanceScore: number;
  risks: string[];
  suggestedNextSteps: string[];
};

export class DocumentIntelligenceService {
  async analyzeDocument(documentId: string): Promise<DocumentIntelligenceResult> {
    const supabase = createAdminClient();
    
    // 1. Fetch document and related credit info
    const { data: doc } = await supabase
      .from("project_document")
      .select("*, project_credits(*)")
      .eq("id", documentId)
      .maybeSingle();

    if (!doc) {
      throw new Error("Document not found");
    }

    // 2. Call Gemini for analysis (Simulated for now, would use file content in prod)
    // In a real implementation, we'd fetch the signed URL, download the content, and send to Gemini.
    // For this V2 update, we'll implement the prompt logic.
    
    const prompt = `
Analyze the following document metadata and credit requirements:
Document Name: ${doc.file_name}
Category: ${doc.doc_category}
Target Credit: ${doc.project_credits?.credit_code} - ${doc.project_credits?.credit_name}
Credit Guidance: ${doc.project_credits?.what_to_submit}

TASK:
1. Provide a 2-sentence operational summary of what this document appears to be.
2. Rate its relevance to the credit requirements (0-100).
3. Identify any immediate risks (e.g., missing signature, wrong category, outdated version).
4. Suggest the next best action for the user.

Output JSON format:
{
  "summary": "...",
  "relevanceScore": 85,
  "risks": ["..."],
  "suggestedNextSteps": ["..."]
}
`;

    // Simulate AI response for now to demonstrate the V2 architecture
    // In production, this would call Gemini.
    const result: DocumentIntelligenceResult = {
      summary: `This is a ${doc.doc_category} for project ${doc.file_name.split('_')[0]}. It covers the technical specifications required for ${doc.project_credits?.credit_code}.`,
      relevanceScore: 92,
      risks: doc.file_name.includes("draft") ? ["Document marked as draft - verify final version before submission."] : [],
      suggestedNextSteps: ["Request Owner Approval", "Verify technical values against IGBC baseline"],
    };

    // 3. Store result in a new document_intelligence table
    await supabase.from("document_intelligence").upsert({
      document_id: documentId,
      summary: result.summary,
      relevance_score: result.relevanceScore,
      risks: result.risks,
      next_steps: result.suggestedNextSteps,
      updated_at: new Date().toISOString(),
    });

    return result;
  }
}

export const documentIntelligenceService = new DocumentIntelligenceService();
