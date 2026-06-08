import { createAdminClient } from "@/lib/supabase/admin";

export interface SuggestedCredit {
  creditCode: string;
  creditId: string;
}

export interface ResponsibleRole {
  roleName: string;
  roleId: string;
  action: string;
}

export interface EvidenceMappingResult {
  suggestedCredits: SuggestedCredit[];
  responsibleRoles: ResponsibleRole[];
}

export class EvidenceMappingEngine {
  public static async evaluate(evidenceType: string): Promise<EvidenceMappingResult> {
    const supabase = createAdminClient();
    
    const result: EvidenceMappingResult = {
      suggestedCredits: [],
      responsibleRoles: []
    };

    if (!evidenceType || evidenceType === "UNKNOWN") {
      return result;
    }

    try {
      // Find evidence type ID
      const { data: evData } = await supabase
        .from("knowledge_evidence_type")
        .select("id")
        .eq("name", evidenceType)
        .maybeSingle();

      if (!evData) {
        return result;
      }

      // 1. Get Suggested Credits
      const { data: creditsData } = await supabase
        .from("credit_evidence_mapping")
        .select("knowledge_credit(id, code)")
        .eq("evidence_type_id", evData.id);

      if (creditsData) {
        creditsData.forEach((row: any) => {
          if (row.knowledge_credit) {
            result.suggestedCredits.push({
              creditCode: row.knowledge_credit.code,
              creditId: row.knowledge_credit.id
            });
          }
        });
      }

      // 2. Get Responsible Roles
      const { data: rolesData } = await supabase
        .from("workflow_document_responsibility")
        .select("workflow_role(id, name), action")
        .eq("evidence_type_id", evData.id);

      if (rolesData) {
        rolesData.forEach((row: any) => {
          if (row.workflow_role) {
            result.responsibleRoles.push({
              roleName: row.workflow_role.name,
              roleId: row.workflow_role.id,
              action: row.action
            });
          }
        });
      }

    } catch (err) {
      console.error("[EvidenceMappingEngine] Error evaluating evidence mapping:", err);
    }

    return result;
  }
}
