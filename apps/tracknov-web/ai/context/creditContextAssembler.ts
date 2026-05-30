import { createAdminClient } from "@/lib/supabase/admin";
import { assertCapability } from "@/lib/auth/capabilityEngine";

export const creditContextAssembler = {
  async assembleContext(projectId: string, creditId: string): Promise<string> {
    const { allowed } = await assertCapability(projectId, "view_project");
    if (!allowed) {
      return "Access Denied.";
    }

    const admin = createAdminClient();
    const { data: credit } = await admin
      .from("project_credits")
      .select("credit_code, credit_name, completion_pct, status, responsible_role")
      .eq("id", creditId)
      .single();

    if (!credit) return "Credit not found.";

    return `
# Credit Context
- **Code:** ${credit.credit_code}
- **Name:** ${credit.credit_name}
- **Completion:** ${credit.completion_pct}%
- **Status:** ${credit.status}
- **Responsible:** ${credit.responsible_role}
    `.trim();
  }
};
