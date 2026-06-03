"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export async function acceptCopilotSuggestionsAction(
  documentId: string,
  projectId: string,
  suggestedCredits: Array<{ creditCode: string; creditId: string }>,
  responsibleRoles: Array<{ roleName: string; roleId: string; action: string }>,
  evidenceType: string
) {
  if (!env.isConfigured) return { ok: false, error: "Not configured" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  try {
    const adminClient = createAdminClient();
    
    // 1. Move Document to the first suggested credit
    if (suggestedCredits && suggestedCredits.length > 0) {
      const primaryCredit = suggestedCredits[0];
      
      // Need to find the project_credit_id for this creditCode in this project
      const { data: projectCredits } = await adminClient
        .from("project_credits")
        .select("id")
        .eq("project_id", projectId)
        .eq("credit_code", primaryCredit.creditCode);
        
      if (projectCredits && projectCredits.length > 0) {
        const projectCreditId = projectCredits[0].id;
        
        await adminClient
          .from("project_document")
          .update({ 
            project_credit_id: projectCreditId,
            credit_id: projectCreditId, // Assuming they might be same or we use projectCreditId for both
            doc_category: evidenceType
          })
          .eq("id", documentId)
          .eq("project_id", projectId);
          
        // 2. Assign responsible roles
        if (responsibleRoles && responsibleRoles.length > 0) {
          for (const role of responsibleRoles) {
            // Assign this role to this document type in this credit
            await adminClient
              .from("assignments")
              .upsert({
                project_id: projectId,
                project_credit_id: projectCreditId,
                document_type: evidenceType,
                role: role.roleName,
                is_active: true
              }, { onConflict: "project_id,project_credit_id,document_type,role" });
          }
        }
      }
    }
    
    // Delete the intelligence suggestion so it doesn't show again, or mark as accepted
    // For now we just delete it so the UI copilot card disappears
    await adminClient
      .from("document_intelligence")
      .delete()
      .eq("document_id", documentId);

    revalidatePath(`/projects/${projectId}/documents`);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (error: any) {
    console.error("Copilot accept failed:", error);
    return { ok: false, error: error.message };
  }
}

export async function dismissCopilotSuggestionsAction(documentId: string, projectId: string) {
  if (!env.isConfigured) return { ok: false, error: "Not configured" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  try {
    const adminClient = createAdminClient();
    await adminClient
      .from("document_intelligence")
      .delete()
      .eq("document_id", documentId);

    revalidatePath(`/projects/${projectId}/documents`);
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}
