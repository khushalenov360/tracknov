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

export function canUploadProjectDocuments(role?: MemberRole | null) {
  return (
    role === "super_user" ||
    role === "super_admin" ||
    role === "project_admin" ||
    role === "owner" ||
    role === "client" ||
    role === "consultant" ||
    role === "architect" ||
    role === "mep" ||
    role === "contractor"
  );
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
