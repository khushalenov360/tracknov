import { extractTextFromPdf } from "@/lib/harita-engine/services/pdf-extractor";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RejectionLearningResult {
  extractedRules: string[];
  injectedPromptParams: string;
}

export const learningLoopService = {
  /**
   * Ingests an official IGBC Clarification Request (CR) or rejection PDF.
   * Leverages Headroom's `learn` module to parse the rejection logic and isolate failure parameters.
   */
  async ingestRejectionPdf(buffer: Buffer, projectId: string, creditId: string): Promise<RejectionLearningResult> {
    const rawText = await extractTextFromPdf(buffer);
    
    // TODO: Send to Headroom `learn` endpoint via MCP or CLI to parse rejection logic
    // Placeholder logic for demonstration
    const isolatedFailureParameter = this.mockHeadroomLearnExtraction(rawText);
    
    const newRule = `CR CONSTRAINT [Project ${projectId} / Credit ${creditId}]: ${isolatedFailureParameter}`;

    // Inject rule into the specific project's configuration context in the database
    // This maintains multi-tenant isolation, ensuring one project's CRs don't leak into another.
    await this.injectRuleIntoProjectContext(projectId, creditId, newRule);

    return {
      extractedRules: [newRule],
      injectedPromptParams: newRule,
    };
  },

  mockHeadroomLearnExtraction(text: string): string {
    // In a real scenario, headroom parse isolates: "The chiller COP submitted does not match the baseline schedule."
    if (text.toLowerCase().includes("chiller")) {
      return "Ensure all chiller COP values strictly match the MEP baseline schedule format.";
    }
    return "Ensure calculation sheets are explicitly attached with vendor submittals.";
  },

  async injectRuleIntoProjectContext(projectId: string, creditId: string, ruleText: string) {
    const adminClient = createAdminClient();
    
    // Store the learned rule in the database so it's injected into the prompt context dynamically
    // when assembleRuntimeContext is called for this specific project.
    await adminClient.from("project_learned_rules").insert({
      project_id: projectId,
      credit_id: creditId,
      rule_text: ruleText,
      source: "igbc_rejection_pdf",
    });
    
    console.log(`[LEARNING LOOP] Injected new rule for project ${projectId}: ${ruleText}`);
  }
};
