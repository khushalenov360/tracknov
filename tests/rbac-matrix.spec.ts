import { expect, test } from "@playwright/test";
import {
  canCreateProjects,
  canDeleteProjects,
  canEditDocumentStatusAtAnyStage,
  canEditOwnDocumentBeforeFinalApproval,
  canManageProject,
  canManageTeamFromRole,
  canReviewProjectDocuments,
  canUploadProjectDocuments,
} from "../lib/rbac";
import type { MemberRole } from "../lib/types";

const roles: MemberRole[] = [
  "super_user",
  "super_admin",
  "project_admin",
  "owner",
  "client",
  "consultant",
  "architect",
  "mep",
  "contractor",
];

test("rbac matrix enforces expected project/delete rights", async () => {
  for (const role of roles) {
    const canCreate = canCreateProjects(role);
    const canDelete = canDeleteProjects(role);
    const canManage = canManageProject(role);

    if (role === "super_user") {
      expect(canCreate).toBe(true);
      expect(canDelete).toBe(true);
      expect(canManage).toBe(true);
    } else if (role === "super_admin") {
      expect(canCreate).toBe(true);
      expect(canDelete).toBe(false);
      expect(canManage).toBe(true);
    } else if (role === "project_admin") {
      expect(canCreate).toBe(false);
      expect(canDelete).toBe(false);
      expect(canManage).toBe(true);
    } else {
      expect(canCreate).toBe(false);
      expect(canDelete).toBe(false);
      expect(canManage).toBe(false);
    }
  }
});

test("rbac matrix enforces review/status boundaries", async () => {
  for (const role of roles) {
    const canReview = canReviewProjectDocuments(role);
    const canEditStatusAny = canEditDocumentStatusAtAnyStage(role);
    const canUpload = canUploadProjectDocuments(role);

    if (["super_user", "super_admin", "project_admin", "owner"].includes(role)) {
      expect(canReview).toBe(true);
    } else {
      expect(canReview).toBe(false);
    }

    if (["super_user", "super_admin", "project_admin"].includes(role)) {
      expect(canEditStatusAny).toBe(true);
    } else {
      expect(canEditStatusAny).toBe(false);
    }

    if (
      [
        "super_user",
        "super_admin",
        "project_admin",
        "owner",
        "consultant",
        "architect",
        "mep",
        "contractor",
      ].includes(role)
    ) {
      expect(canUpload).toBe(true);
    } else {
      expect(canUpload).toBe(false);
    }
  }
});

test("rbac matrix enforces contributor/self-edit and team controls", async () => {
  for (const role of roles) {
    const selfEdit = canEditOwnDocumentBeforeFinalApproval(role);
    const canManageTeam = canManageTeamFromRole(role);

    if (["owner", "consultant", "architect", "mep", "contractor"].includes(role)) {
      expect(selfEdit).toBe(true);
    } else {
      expect(selfEdit).toBe(false);
    }

    if (["super_user", "super_admin", "project_admin", "owner"].includes(role)) {
      expect(canManageTeam).toBe(true);

    } else {
      expect(canManageTeam).toBe(false);
    }
  }
});
