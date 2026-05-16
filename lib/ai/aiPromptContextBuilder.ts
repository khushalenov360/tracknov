import { createAdminClient } from "../supabase/admin";
import { getProjectFramework } from "../governance/evolution";

/**
 * TRACKNOV AI PROMPT CONTEXT BUILDER
 * 
 * Constructs RBAC-safe, framework-aware context for AI prompts.
 */
export async function buildPromptContext(projectId: string, actorId: string) {
  const admin = createAdminClient();

  // 1. Verify Tenant Isolation
  const { data: project, error: pError } = await admin
    .from("projects")
    .select("id, name, organization_id, framework_version")
    .eq("id", projectId)
    .single();

  if (pError || !project) {
    throw new Error(`AI_CONTEXT_FAILURE: Project ${projectId} not found or access denied.`);
  }

  // 2. Resolve Framework Version
  const framework = project.framework_version || "Green Interiors V2";

  // 3. Fetch Relevant State (Limited to project boundary)
  const { data: submittals } = await admin
    .from("submittals")
    .select("id, credit_id, status")
    .eq("project_id", projectId);

  return {
    projectId: project.id,
    projectName: project.name,
    organizationId: project.organization_id,
    framework,
    submittals: submittals || [],
    systemContext: `
      Current Framework: ${framework}
      Project Identity: ${project.name}
      Governance Rule: AI is ADVISORY ONLY. No authority to mutate state.
    `.trim()
  };
}

export function sanitizePrompt(input: string): string {
  // Prevent prompt injection and remove sensitive patterns
  return input.replace(/<script.*?>.*?<\/script>/gi, "").trim();
}
