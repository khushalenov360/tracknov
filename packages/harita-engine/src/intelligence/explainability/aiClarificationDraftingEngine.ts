import { v4 as uuidv4 } from "uuid";
import { createAdminClient } from "../../supabase/admin";
import { logAiRecommendation } from "../../telemetry/aiRuntimeAuditLogger";
import { buildPromptContext } from "../../document-intelligence/aiPromptContextBuilder";

/**
 * TRACKNOV AI CLARIFICATION DRAFTING ENGINE
 * 
 * Drafts professional clarifications for reviewers.
 */
export async function draftClarification(projectId: string, submittalId: string, issueSummary: string) {
  const admin = createAdminClient();
  const context = await buildPromptContext(projectId, "SYSTEM");

  // Simulate drafting
  const draft = `
    Dear Applicant, 
    Regarding submittal ${submittalId}, please provide additional calculations for solar reflectance index (SRI). 
    Current evidence lacks the specific material coefficients required by ${context.framework}.
  `.trim();

  // Log draft recommendation
  await logAiRecommendation({
    projectId,
    recommendationType: "CLARIFICATION_DRAFT",
    payload: { submittalId, draft, issueSummary },
    reasoning: "Reviewer flagged missing SRI calculations."
  });

  // Store in database for reviewer review
  const { data, error } = await admin.from("ai_clarification_drafts").insert({
    project_id: projectId,
    submittal_id: submittalId,
    draft_content: draft,
    status: "draft",
    trace_id: uuidv4(),
    causality_chain_id: uuidv4()
  }).select().single();

  if (error) throw error;

  return data;
}
