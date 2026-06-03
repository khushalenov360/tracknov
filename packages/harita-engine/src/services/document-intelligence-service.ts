import { createAdminClient } from "@/lib/supabase/admin";
import { DocumentParser } from "../document-intelligence/DocumentParser";
import { DocumentClassifier } from "../document-intelligence/DocumentClassifier";
import { EvidenceMappingEngine } from "../intelligence/evidence/evidence-mapping-engine";

export type DocumentIntelligenceResult = {
  summary: string;
  relevanceScore: number;
  risks: string[];
  suggestedNextSteps: string[];
  evidenceType?: string;
  parsedText?: string;
};

export class DocumentIntelligenceService {
  private parser = new DocumentParser();
  private classifier = new DocumentClassifier();

  async analyzeDocument(documentId: string): Promise<DocumentIntelligenceResult> {
    const supabase = createAdminClient();
    
    // 1. Fetch document and related credit info
    const { data: doc } = await supabase
      .from("project_document")
      .select("*, project_credits(*)")
      .eq("id", documentId)
      .maybeSingle();

    if (!doc || !doc.file_path) {
      throw new Error("Document or file path not found");
    }

    // 2. Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("project-documents")
      .download(doc.file_path);

    if (downloadError || !fileData) {
      console.error("Failed to download file from storage:", downloadError);
      throw new Error("Failed to download file from storage");
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // 3. Parse and classify the document deterministically (NO AI)
    let parsedText = "";
    let evidenceType = "UNKNOWN";

    try {
      const parsed = await this.parser.parse(buffer, doc.file_name);
      parsedText = parsed.text;
      evidenceType = this.classifier.classifyText(parsedText, doc.file_name);
    } catch (parseError) {
      console.error("Parsing failed:", parseError);
    }

    // 4. Construct the intelligence result
    const risks: string[] = [];
    if (doc.file_name.includes("draft")) {
      risks.push("Document marked as draft - verify final version before submission.");
    }
    
    // Add risk if the determined evidence type does not seem to match the expected category
    // For now we just record it.
    if (evidenceType !== "UNKNOWN" && doc.doc_category) {
      // In a real system, we'd cross check evidenceType against doc.doc_category
      // But for this MVP, we just include it in the summary.
    }

    const result: DocumentIntelligenceResult = {
      summary: `Deterministically classified as: ${evidenceType}. Extracted ${parsedText.length} characters of text. Target Credit: ${doc.project_credits?.credit_code || "Unknown"}.`,
      relevanceScore: evidenceType !== "UNKNOWN" ? 95 : 50, // High confidence if we mapped it
      risks,
      suggestedNextSteps: ["Request Owner Approval", "Verify technical values against IGBC baseline"],
      evidenceType,
      parsedText: parsedText.slice(0, 1000) // Keep a snippet for debugging/summary
    };

    // 5. Query Evidence Mapping Engine
    const mappingResult = await EvidenceMappingEngine.evaluate(evidenceType);

    // 6. Store result in document_intelligence table
    await supabase.from("document_intelligence").upsert({
      document_id: documentId,
      summary: result.summary,
      relevance_score: result.relevanceScore,
      risks: result.risks,
      next_steps: result.suggestedNextSteps,
      evidence_type: evidenceType,
      suggested_credits: mappingResult.suggestedCredits,
      responsible_roles: mappingResult.responsibleRoles,
      updated_at: new Date().toISOString(),
    });

    return result;
  }
}

export const documentIntelligenceService = new DocumentIntelligenceService();
