import { createAdminClient } from "@/lib/supabase/admin";
import { assertCapability } from "@/lib/auth/capabilityEngine";

export const projectContextAssembler = {
  async assembleContext(projectId: string, userRole: string): Promise<string> {
    const { allowed } = await assertCapability(projectId, "view_project");
    if (!allowed) {
      return "Access Denied: You do not have permission to access context for this project.";
    }

    const admin = createAdminClient();
    const { data: project } = await admin
      .from("projects")
      .select("name, client, location, certification_state, target_rating")
      .eq("id", projectId)
      .single();

    if (!project) return "Project not found.";

    return `
# Project Context
- **Name:** ${project.name}
- **Client:** ${project.client || "N/A"}
- **Location:** ${project.location || "N/A"}
- **Certification State:** ${project.certification_state}
- **Target Rating:** ${project.target_rating}
    `.trim();
  }
};
