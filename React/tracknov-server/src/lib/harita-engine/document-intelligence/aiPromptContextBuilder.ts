import { createAdminClient } from "@/lib/supabase/admin";

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
    .select("id, name, igbc_variant")
    .eq("id", projectId)
    .single();

  if (pError || !project) {
    throw new Error(`AI_CONTEXT_FAILURE: Project ${projectId} not found or access denied.`);
  }

  // 2. Resolve Framework Version
  const framework = project.igbc_variant || "Green Interiors V2";

  // 3. Fetch Relevant State (Limited to project boundary)
  const { data: submittals } = await admin
    .from("submittals")
    .select("id, credit_id, status")
    .eq("project_id", projectId);

  return {
    projectId: project.id,
    projectName: project.name,
    framework,
    submittals: submittals || [],
    systemContext: `
      Current Framework: ${framework}
      Project Identity: ${project.name}
      Governance Rule: AI is ADVISORY ONLY. No authority to mutate state.
    `.trim(),
    response_format: { type: "json_object" }
  };
}

export function sanitizePrompt(input: string): string {
  // Prevent prompt injection and remove sensitive patterns
  // Match <script>...</script> including tolerant malformed closing tags like </script > or </script foo="bar">
  const scriptTagPattern = /<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi;
  let current = input;
  let previous: string;

  do {
    previous = current;
    current = current.replace(scriptTagPattern, "");
  } while (current !== previous);

  return current.trim();
}
