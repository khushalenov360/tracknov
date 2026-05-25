import { createAdminClient } from "@/lib/supabase/admin";

export const workflowContextAssembler = {
  async assembleContext(projectId: string): Promise<string> {
    const admin = createAdminClient();
    
    // We fetch a summarized count of pending reviews and bottlenecks.
    const { data: docs } = await admin
      .from("project_document")
      .select("state, status")
      .eq("project_id", projectId);

    if (!docs) return "No workflow data available.";

    let pendingReviews = 0;
    let rejected = 0;

    for (const doc of docs) {
      if (["L1_REVIEW", "UNDER_L3_REVIEW", "RESUBMITTED"].includes(doc.state)) pendingReviews++;
      if (["REJECTED", "CLARIFICATION", "L1_REJECTED"].includes(doc.state)) rejected++;
    }

    return `
# Workflow Context
- **Pending Reviews:** ${pendingReviews}
- **Blocked/Clarifications:** ${rejected}
    `.trim();
  }
};
