import type { MemberRole } from "@/lib/types";

export function canCreateProjects(role?: MemberRole | null) {
  return role === "super_user" || role === "super_admin";
}

export function canManageProject(role?: MemberRole | null) {
  return role === "super_user" || role === "super_admin" || role === "project_admin";
}

export function canDeleteProjects(role?: MemberRole | null) {
  return role === "super_user";
}

export function canReviewProjectDocuments(role?: MemberRole | null) {
  return role === "super_user" || role === "super_admin" || role === "project_admin" || role === "owner";
}

export function canEditDocumentStatusAtAnyStage(role?: MemberRole | null) {
  return role === "super_user" || role === "super_admin" || role === "project_admin";
}

export function canEditOwnDocumentBeforeFinalApproval(role?: MemberRole | null) {
  return (
    role === "owner" ||
    role === "consultant" ||
    role === "architect" ||
    role === "mep" ||
    role === "contractor"
  );
}

export function canUploadProjectDocuments(role?: MemberRole | null) {
  return (
    role === "super_user" ||
    role === "consultant" ||
    role === "architect" ||
    role === "mep" ||
    role === "contractor"
  );
}

export function isL0Role(role?: MemberRole | null) {
  return role === "consultant" || role === "architect" || role === "mep" || role === "contractor";
}

export function isL1Role(role?: MemberRole | null) {
  return role === "owner";
}

export function isL2Role(role?: MemberRole | null) {
  return role === "client";
}

export function isL3Role(role?: MemberRole | null) {
  return role === "project_admin" || role === "super_admin";
}

export function isL5Role(role?: MemberRole | null) {
  return role === "super_user";
}

export function canManageTeamFromRole(role?: MemberRole | null) {
  return (
    role === "super_user" ||
    role === "super_admin" ||
    role === "project_admin" ||
    role === "client" ||
    role === "owner"
  );
}

export function canEditPlanControls(role?: MemberRole | null) {
  return role === "super_user" || role === "project_admin";
}

export function canAccessBillingAndInvoice(role?: MemberRole | null) {
  return (
    role === "super_user" ||
    role === "super_admin" ||
    role === "project_admin" ||
    role === "client"
  );
}

export function canManageProjectGuidebook(role?: MemberRole | null) {
  return role === "super_user" || role === "project_admin";
}
