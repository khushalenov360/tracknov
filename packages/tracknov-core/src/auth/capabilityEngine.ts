import { createClient } from "@/lib/supabase/server";

export type ActionCapability = 
  | "view_project"
  | "edit_project"
  | "submit_document"
  | "review_document"
  | "approve_document"
  | "assign_task"
  | "bypass_validation"
  | "lock_manual"
  | "audit_logs";

export type RoleCapabilityMap = Record<string, ActionCapability[]>;

const CAPABILITY_MAP: RoleCapabilityMap = {
  super_user: [
    "view_project", "edit_project", "submit_document", "review_document", 
    "approve_document", "assign_task", "bypass_validation", "lock_manual", "audit_logs"
  ],
  project_admin: [
    "view_project", "edit_project", "submit_document", "review_document", 
    "approve_document", "assign_task", "audit_logs"
  ],
  owner: [
    "view_project", "submit_document", "review_document"
  ],
  architect: ["view_project", "submit_document"],
  mep: ["view_project", "submit_document"],
  consultant: ["view_project", "submit_document", "review_document"],
  contractor: ["view_project", "submit_document"],
};

export async function hasCapability(role: string | null | undefined, capability: ActionCapability): Promise<boolean> {
  if (!role) return false;
  const capabilities = CAPABILITY_MAP[role] || [];
  return capabilities.includes(capability);
}

export function canUser(role: string, action: string, context: any): boolean {
  const capabilities = CAPABILITY_MAP[role] || [];
  return capabilities.includes(action as ActionCapability);
}

export async function assertCapability(projectId: string, capability: ActionCapability): Promise<{ allowed: boolean, role: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { allowed: false, role: null };
  }

  const { data: membership } = await supabase
    .from("project_users")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  const role = membership?.role ?? null;
  const allowed = await hasCapability(role, capability);

  return { allowed, role };
}
