import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data";

export type WorkflowContext = {
  projectId: string;
  projectCode: string | null;
  currentRole: string | null;
  lockState: {
    locked: boolean;
    reason: string | null;
  };
  workflowStats: {
    pendingUploads: number;
    pendingReviews: number;
    pendingValidations: number;
  };
};

/**
 * Builds a project-scoped, role-aware context object for the Harita.
 * Ensures all AI responses are anchored in the current project reality.
 */
export async function buildWorkflowContext(projectId: string): Promise<WorkflowContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createClient();

  // Fetch project basic info and membership
  const { data: membership } = await supabase
    .from("project_users")
    .select("role, project:projects(project_code, certification_status)")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return null;

  // Fetch workflow stats
  const { data: credits } = await supabase
    .from("project_credits")
    .select("id, assigned_user_id")
    .eq("project_id", projectId);

  const { data: documents } = await supabase
    .from("project_document")
    .select("id, workflow_state")
    .eq("project_id", projectId)
    .eq("is_latest", true);

  const stats = {
    pendingUploads: (credits || []).filter(c => !c.assigned_user_id).length,
    pendingReviews: (documents || []).filter(d => d.workflow_state === "SUBMITTED").length,
    pendingValidations: (documents || []).filter(d => d.workflow_state === "UNDER_REVIEW").length,
  };

  return {
    projectId,
    projectCode: (membership.project as any)?.project_code || null,
    currentRole: membership.role,
    lockState: {
      locked: (membership.project as any)?.certification_status === "CERTIFIED",
      reason: (membership.project as any)?.certification_status === "CERTIFIED" ? "Project is certified and locked." : null,
    },
    workflowStats: stats,
  };
}
