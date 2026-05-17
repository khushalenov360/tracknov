import type { MemberRole } from "@/lib/types";

/**
 * TRACKNOV AUTHORITATIVE RBAC ENGINE
 * 
 * Implements Section 8 and Section 25 of the Master Execution Handoff.
 * Standardizes authorization across the entire platform.
 * 
 * VERSION: 1.0.0 (Governance Evolution Control)
 */

export type RoleLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * AUTHORITATIVE ROLE PRECEDENCE MATRIX
 * Section 4: Role Evolution Governance
 */
export const ROLE_PRECEDENCE_MATRIX: Record<MemberRole, RoleLevel> = {
  L5: 5,
  super_user: 5,
  L4: 4,
  l4_reserved: 4,
  L3: 3,
  super_admin: 3,
  project_admin: 3,
  L2: 2,
  client: 2,
  L1: 1,
  owner: 1,
  L0: 0,
  consultant: 0,
  architect: 0,
  mep: 0,
  contractor: 0,
};

export function getRoleLevel(role?: MemberRole | null): RoleLevel {
  if (!role) return 0;
  return ROLE_PRECEDENCE_MATRIX[role] ?? 0;
}

/**
 * AUTHORITATIVE AUTHORIZATION ENGINE
 * canUser(action, entity, context)
 */
export function canUser(
  role: MemberRole | null | undefined,
  action: "UPLOAD" | "APPROVE" | "REJECT" | "DELETE" | "MANAGE_TEAM" | "EXPORT" | "MANAGE_GUIDEBOOK" | "MANAGE_TOKENS" | "EDIT_CONTROLS" | "VIEW_BILLING",
  entityType: "DOCUMENT" | "PROJECT" | "CREDIT" | "TEAM" | "SYSTEM",
  entityStatus?: string
): boolean {
  const level = getRoleLevel(role);

  // L5 Bypass: Super User can do everything except mutation in CERTIFIED_LOCKED state (handled by DB triggers)
  if (level === 5) return true;

  switch (action) {
    case "UPLOAD":
      // L0 and above can upload to non-locked projects
      return level >= 0;

    case "APPROVE":
    case "REJECT":
      // Only L3 and above can perform final approvals
      // L1 (Owner) can "Forward/Review" but the formal "APPROVE" for certification is L3+
      return level >= 3;

    case "DELETE":
      // Only L5 can delete projects (L5 bypasses above)
      if (entityType === "PROJECT") return false;
      // L3 can delete documents
      return level >= 3;

    case "MANAGE_TEAM":
      // L1 and above can manage team
      return level >= 1;

    case "EXPORT":
      // L1 and above can export
      return level >= 1;

    case "MANAGE_GUIDEBOOK":
      return level >= 3;

    case "MANAGE_TOKENS":
      return false; // L5 bypasses above

    case "EDIT_CONTROLS":
      return level >= 3;

    case "VIEW_BILLING":
      return level >= 2; // Clients (L2) and above can view billing

    default:
      return false;
  }
}

// LEGACY HELPERS (for backward compatibility during migration)
export function canCreateProjects(role?: MemberRole | null) {
  return getRoleLevel(role) >= 3;
}

export function canManageProject(role?: MemberRole | null) {
  return getRoleLevel(role) >= 3;
}

export function canDeleteProjects(role?: MemberRole | null) {
  return getRoleLevel(role) === 5;
}

export function canReviewProjectDocuments(role?: MemberRole | null) {
  return getRoleLevel(role) >= 1;
}

export function canEditDocumentStatusAtAnyStage(role?: MemberRole | null) {
  return getRoleLevel(role) >= 3;
}

export function canUploadProjectDocuments(role?: MemberRole | null) {
  return getRoleLevel(role) >= 0;
}

export function isL0Role(role?: MemberRole | null) {
  return getRoleLevel(role) === 0;
}

export function isL1Role(role?: MemberRole | null) {
  return getRoleLevel(role) === 1;
}

export function isL2Role(role?: MemberRole | null) {
  return getRoleLevel(role) === 2;
}

export function isL3Role(role?: MemberRole | null) {
  return getRoleLevel(role) === 3;
}

export function isL5Role(role?: MemberRole | null) {
  return getRoleLevel(role) === 5;
}

export function canManageTeamFromRole(role?: MemberRole | null) {
  return getRoleLevel(role) >= 1;
}

export function canAssignTasks(role?: MemberRole | null) {
  return getRoleLevel(role) >= 1;
}

export function canEditPlanControls(role?: MemberRole | null) {
  return getRoleLevel(role) >= 3;
}

export function canAccessBillingAndInvoice(role?: MemberRole | null) {
  return getRoleLevel(role) >= 2;
}

export function canManageTokens(role?: MemberRole | null) {
  return getRoleLevel(role) === 5;
}

export function canManageProjectGuidebook(role?: MemberRole | null) {
  return getRoleLevel(role) >= 3;
}

export function canExportProjectArtifacts(role?: MemberRole | null) {
  return getRoleLevel(role) >= 1;
}

export function canEditOwnDocumentBeforeFinalApproval(role?: MemberRole | null) {
  return getRoleLevel(role) >= 0;
}
