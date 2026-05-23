import { ActionCapability, assertCapability } from "@/lib/auth/capabilityEngine";
import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ExecutionContext {
  actorId: string;
  projectId: string;
  entityType: string;
  entityId: string;
  action: string;
}

export interface ExecutionResult {
  success: boolean;
  workflowState?: string;
  validationState?: string;
  errors?: string[];
  auditHash?: string;
  data?: any;
}

export async function executeAction(
  context: ExecutionContext,
  capabilityRequired: ActionCapability,
  operation: (admin: SupabaseClient, userRole: string | null) => Promise<ExecutionResult>
): Promise<ExecutionResult> {
  const { allowed, role } = await assertCapability(context.projectId, capabilityRequired);
  
  if (!allowed) {
    return {
      success: false,
      errors: [`Access Denied: Missing capability '${capabilityRequired}' for role '${role}'`],
    };
  }

  const admin = createAdminClient();

  try {
    const result = await operation(admin, role);
    
    if (!result.success) {
      return result;
    }

    const { data: audit } = await admin.from("audit_logs").insert({
      project_id: context.projectId,
      action: context.action,
      entity_type: context.entityType,
      entity_id: context.entityId,
      actor_id: context.actorId,
      metadata: { role },
    }).select("id").single();

    return {
      ...result,
      auditHash: audit?.id,
    };
  } catch (error: any) {
    return {
      success: false,
      errors: [error.message || "Execution Context failed"],
    };
  }
}
