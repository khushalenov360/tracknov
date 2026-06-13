// ============================================================
// UploadCopilotEngine
// ============================================================
// Called immediately after a document is parsed to give the
// contributor structured, consultant-grade upload guidance:
//
//   Detected:         Drawing
//   Mapped Credit:    EDA C1
//   Evidence Found:   ✓ Circulation Layout  ✓ Passage Width
//   Missing:          ✗ Area Statement  ✗ Occupancy Calculation
//   Strength:         60%
//   Readiness:        Partially Ready
//   Action:           Upload Area Statement next
//
// Combines DocumentClassifier + EvidenceMappingEngine +
// EvidenceAssessmentEngine into a single call.
// ============================================================

import { SupabaseClient } from "@supabase/supabase-js";
import { EvidenceAssessmentEngine, AssessmentResult } from "../evidence/evidence-assessment-engine";
import { EvidenceMappingEngine } from "../evidence/evidence-mapping-engine";

export interface UploadCopilotResult {
  filename: string;
  detectedType: string;
  primaryCredit: string | null;
  allSuggestedCredits: string[];
  responsibleRole: string | null;
  assessment: AssessmentResult | null;
  uploadGuidance: string;
}

export class UploadCopilotEngine {
  /**
   * Run the full upload copilot pipeline on a freshly parsed document.
   *
   * @param supabase         Admin Supabase client
   * @param llmClients       { geminiApiKey, groqApiKey, openaiApiKey }
   * @param filename         Original filename (e.g. "Layout.pdf")
   * @param evidenceType     Classified evidence type (e.g. "DRAWING")
   * @param parsedContent    Extracted text from DocumentParser
   * @param projectId        Optional project context for portfolio duplicate detection
   */
  public static async guide(
    supabase: SupabaseClient,
    llmClients: { geminiApiKey?: string; groqApiKey?: string; openaiApiKey?: string },
    filename: string,
    evidenceType: string,
    parsedContent: string,
    projectId?: string
  ): Promise<UploadCopilotResult> {

    // ── 1. Map evidence type → credits + roles ───────────────────────────
    const mapping = await EvidenceMappingEngine.evaluate(evidenceType);
    const primaryCredit = mapping.suggestedCredits[0]?.creditCode ?? null;
    const primaryCreditId = mapping.suggestedCredits[0]?.creditId ?? null;
    const allCredits = mapping.suggestedCredits.map(c => c.creditCode);
    const responsibleRole = mapping.responsibleRoles[0]?.roleName ?? null;

    // ── 2. Run Evidence Assessment if we have a credit ───────────────────
    let assessment: AssessmentResult | null = null;
    if (primaryCreditId) {
      assessment = await EvidenceAssessmentEngine.assess(
        supabase,
        llmClients,
        primaryCreditId,
        filename,
        parsedContent
      );
    }

    // ── 3. Generate human-readable upload guidance ───────────────────────
    const guidance = UploadCopilotEngine._buildGuidance(
      filename,
      evidenceType,
      primaryCredit,
      allCredits,
      responsibleRole,
      assessment
    );

    return {
      filename,
      detectedType: evidenceType,
      primaryCredit,
      allSuggestedCredits: allCredits,
      responsibleRole,
      assessment,
      uploadGuidance: guidance,
    };
  }

  private static _buildGuidance(
    filename: string,
    evidenceType: string,
    primaryCredit: string | null,
    allCredits: string[],
    responsibleRole: string | null,
    assessment: AssessmentResult | null
  ): string {
    const lines: string[] = [];

    lines.push(`📄 File Received: ${filename}`);
    lines.push(`\nDetected:\n  ${evidenceType}`);

    if (primaryCredit) {
      lines.push(`\nMapped Credit:\n  ${primaryCredit}`);
      if (allCredits.length > 1) {
        lines.push(`  Also satisfies: ${allCredits.slice(1).join(", ")}`);
      }
    } else {
      lines.push(`\nMapped Credit:\n  No credit mapping found for this evidence type.`);
    }

    if (responsibleRole) {
      lines.push(`\nResponsible Role:\n  ${responsibleRole}`);
    }

    if (assessment) {
      lines.push(`\nEvidence Found:`);
      if (assessment.evidenceFound.length) {
        assessment.evidenceFound.forEach(e => lines.push(`  ✓ ${e}`));
      } else {
        lines.push("  (none detected)");
      }

      lines.push(`\nMissing:`);
      if (assessment.missingEvidence.length) {
        assessment.missingEvidence.forEach(e => lines.push(`  ✗ ${e}`));
      } else {
        lines.push("  (none — document is complete)");
      }

      if (assessment.weakEvidence.length) {
        lines.push(`\nWeak Evidence:`);
        assessment.weakEvidence.forEach(e => lines.push(`  ⚠ ${e}`));
      }

      lines.push(`\nAssessment:\n  ${assessment.readinessState}`);
      lines.push(`\nReadiness:\n  ${assessment.strengthScore}%`);
      lines.push(`\nRecommended Action:\n  ${assessment.recommendedAction}`);
    } else {
      lines.push(`\nAssessment:\n  Unable to assess — credit mapping not found.`);
    }

    return lines.join("\n");
  }
}
