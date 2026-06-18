import { createAdminClient } from "@/lib/supabase/admin";
import { DocumentParser } from "../document-intelligence/DocumentParser";
import { DocumentClassifier } from "../document-intelligence/DocumentClassifier";
import { EvidenceMappingEngine } from "../intelligence/evidence/evidence-mapping-engine";
import { dispatchSubmittalToPipeline } from "@/services/IngestionDispatcher";
import {
  evaluateDaylightCompliance,
  evaluateMaterialsCompliance,
} from "@/services/ComplianceAssertionEngine";

export type DocumentIntelligenceResult = {
  summary: string;
  relevanceScore: number;
  risks: string[];
  suggestedNextSteps: string[];
  evidenceType?: string;
  parsedText?: string;
  pipeline?: string;
  extractedVariables?: Record<string, unknown>;
  complianceSnapshot?: Record<string, unknown> | null;
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
    let extractedVariables: Record<string, unknown> = {};
    let pipeline = "fallback";
    let complianceSnapshot: Record<string, unknown> | null = null;
    const risks: string[] = [];

    try {
      const parsed = await this.parser.parse(buffer, doc.file_name);
      parsedText = parsed.text;
      evidenceType = this.classifier.classifyText(parsedText, doc.file_name);

      const dispatched = await dispatchSubmittalToPipeline({
        fileBuffer: buffer,
        filename: doc.file_name,
        mimeType: doc.mime_type || "",
        creditCategory: doc.project_credits?.category || doc.project_credits?.category_name,
      });

      pipeline = dispatched.pipeline;
      extractedVariables = dispatched.extractedVariables;
      if (typeof extractedVariables.rawText !== "string" && parsedText) {
        extractedVariables.rawText = parsedText.slice(0, 4000);
      }

      if (Array.isArray(extractedVariables.materials) && extractedVariables.materials.length > 0) {
        complianceSnapshot = {
          family: "materials",
          report: evaluateMaterialsCompliance(extractedVariables.materials as any[]),
        };
      } else if (
        Array.isArray(extractedVariables.spatialZones) &&
        extractedVariables.spatialZones.length > 0
      ) {
        complianceSnapshot = {
          family: "daylight",
          report: evaluateDaylightCompliance(extractedVariables.spatialZones as any[]),
        };
      }

      if (dispatched.errors.length > 0) {
        risks.push(...dispatched.errors);
      }
    } catch (parseError) {
      console.error("Parsing failed:", parseError);
    }

    // 4. Construct the intelligence result
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
      summary: [
        `Deterministically classified as: ${evidenceType}.`,
        `Pipeline: ${pipeline}.`,
        `Extracted ${parsedText.length} characters of text.`,
        `Target Credit: ${doc.project_credits?.credit_code || "Unknown"}.`,
        complianceSnapshot
          ? `Deterministic compliance snapshot available for ${complianceSnapshot.family}.`
          : "No deterministic compliance snapshot was produced for this document.",
      ].join(" "),
      relevanceScore: evidenceType !== "UNKNOWN" ? 95 : 50, // High confidence if we mapped it
      risks,
      suggestedNextSteps: ["Request Owner Approval", "Verify technical values against IGBC baseline"],
      evidenceType,
      parsedText: parsedText.slice(0, 1000), // Keep a snippet for debugging/summary
      pipeline,
      extractedVariables,
      complianceSnapshot,
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
