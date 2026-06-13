"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PRECEDENCE_MATRIX = void 0;
exports.getRoleLevel = getRoleLevel;
exports.canUser = canUser;
exports.canCreateProjects = canCreateProjects;
exports.canManageProject = canManageProject;
exports.canDeleteProjects = canDeleteProjects;
exports.canReviewProjectDocuments = canReviewProjectDocuments;
exports.canEditDocumentStatusAtAnyStage = canEditDocumentStatusAtAnyStage;
exports.canUploadProjectDocuments = canUploadProjectDocuments;
exports.isL0Role = isL0Role;
exports.isL1Role = isL1Role;
exports.isL2Role = isL2Role;
exports.isL3Role = isL3Role;
exports.isL5Role = isL5Role;
exports.canManageTeamFromRole = canManageTeamFromRole;
exports.canAssignTasks = canAssignTasks;
exports.canEditPlanControls = canEditPlanControls;
exports.canAccessBillingAndInvoice = canAccessBillingAndInvoice;
exports.canManageTokens = canManageTokens;
exports.canManageProjectGuidebook = canManageProjectGuidebook;
exports.canExportProjectArtifacts = canExportProjectArtifacts;
exports.canEditOwnDocumentBeforeFinalApproval = canEditOwnDocumentBeforeFinalApproval;
/**
 * AUTHORITATIVE ROLE PRECEDENCE MATRIX
 * Section 4: Role Evolution Governance
 */
exports.ROLE_PRECEDENCE_MATRIX = {
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
function getRoleLevel(role) {
    var _a, _b;
    if (!role)
        return 0;
    const r = role.toUpperCase();
    if (r === "L0" || r === "L1" || r === "L2" || r === "L3" || r === "L4" || r === "L5") {
        return (_a = exports.ROLE_PRECEDENCE_MATRIX[r]) !== null && _a !== void 0 ? _a : 0;
    }
    return (_b = exports.ROLE_PRECEDENCE_MATRIX[role]) !== null && _b !== void 0 ? _b : 0;
}
/**
 * AUTHORITATIVE AUTHORIZATION ENGINE
 * canUser(action, entity, context)
 */
function canUser(role, action, entityType, entityStatus) {
    const level = getRoleLevel(role);
    // L5 Bypass: Super User can do everything except mutation in CERTIFIED_LOCKED state (handled by DB triggers)
    if (level === 5)
        return true;
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
            if (entityType === "PROJECT")
                return false;
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
function canCreateProjects(role) {
    return role ? ["super_user", "super_admin", "L5"].includes(role) : false;
}
function canManageProject(role) {
    return getRoleLevel(role) >= 3;
}
function canDeleteProjects(role) {
    return getRoleLevel(role) === 5;
}
function canReviewProjectDocuments(role) {
    return role ? ["super_user", "super_admin", "project_admin", "owner", "L5", "L3", "L1"].includes(role) : false;
}
function canEditDocumentStatusAtAnyStage(role) {
    return getRoleLevel(role) >= 3;
}
function canUploadProjectDocuments(role) {
    return role ? ["super_user", "super_admin", "project_admin", "owner", "consultant", "architect", "mep", "contractor", "L5", "L3", "L1", "L0"].includes(role) : false;
}
function isL0Role(role) {
    return getRoleLevel(role) === 0;
}
function isL1Role(role) {
    return getRoleLevel(role) === 1;
}
function isL2Role(role) {
    return getRoleLevel(role) === 2;
}
function isL3Role(role) {
    return getRoleLevel(role) === 3;
}
function isL5Role(role) {
    return getRoleLevel(role) === 5;
}
function canManageTeamFromRole(role) {
    return role ? ["super_user", "super_admin", "project_admin", "owner", "L5", "L3", "L1"].includes(role) : false;
}
function canAssignTasks(role) {
    return getRoleLevel(role) >= 1;
}
function canEditPlanControls(role) {
    return getRoleLevel(role) >= 3;
}
function canAccessBillingAndInvoice(role) {
    return getRoleLevel(role) >= 2;
}
function canManageTokens(role) {
    return getRoleLevel(role) === 5;
}
function canManageProjectGuidebook(role) {
    return getRoleLevel(role) >= 3;
}
function canExportProjectArtifacts(role) {
    return getRoleLevel(role) >= 1;
}
function canEditOwnDocumentBeforeFinalApproval(role) {
    return role ? ["owner", "consultant", "architect", "mep", "contractor", "L1", "L0"].includes(role) : false;
}
