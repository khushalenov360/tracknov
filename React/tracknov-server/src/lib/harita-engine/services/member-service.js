"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memberService = exports.MemberService = void 0;
const uuid_1 = require("uuid");
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
const activity_service_1 = require("./activity-service");
class MemberService {
    get client() { return (0, server_1.createClient)(); }
    get admin() { return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.client; }
    removeMember(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (user.role !== "super_user") {
                throw new Error("Only Super User can remove users.");
            }
            const { error } = yield this.admin
                .from("project_users")
                .delete()
                .eq("project_id", params.projectId)
                .eq("user_id", params.userId);
            if (error)
                throw error;
        });
    }
    disableMember(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (user.role !== "super_user") {
                throw new Error("Only Super User can disable users.");
            }
            const reason = params.reason.trim();
            if (!reason) {
                throw new Error("Disable reason is required.");
            }
            const { error } = yield this.admin
                .from("profiles")
                .update({
                disabled_at: new Date().toISOString(),
                disabled_reason: reason,
            })
                .eq("user_id", params.userId);
            if (error)
                throw error;
            yield (0, activity_service_1.logSystemActivity)(this.admin, {
                projectId: null,
                entityType: "team",
                entityId: params.userId,
                action: "user_disabled",
                actorId: user.id,
                actorRole: user.role,
                summary: `User account disabled.`,
                details: {
                    target_user_id: params.userId,
                    reason,
                },
            });
        });
    }
    reactivateMember(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (user.role !== "super_user") {
                throw new Error("Only Super User can reactivate users.");
            }
            const { error } = yield this.admin
                .from("profiles")
                .update({
                disabled_at: null,
                disabled_reason: null,
            })
                .eq("user_id", params.userId);
            if (error)
                throw error;
            yield (0, activity_service_1.logSystemActivity)(this.admin, {
                projectId: null,
                entityType: "team",
                entityId: params.userId,
                action: "user_reactivated",
                actorId: user.id,
                actorRole: user.role,
                summary: `User account reactivated.`,
                details: {
                    target_user_id: params.userId,
                },
            });
        });
    }
    reassignMemberProject(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (user.role !== "super_user") {
                throw new Error("Only Super User can reassign users.");
            }
            if (!params.fromProjectId || !params.toProjectId || params.fromProjectId === params.toProjectId) {
                throw new Error("Valid source and destination projects are required.");
            }
            const { error: removeError } = yield this.admin
                .from("project_users")
                .delete()
                .eq("project_id", params.fromProjectId)
                .eq("user_id", params.userId);
            if (removeError)
                throw removeError;
            const { error: addError } = yield this.admin.from("project_users").insert({
                project_id: params.toProjectId,
                user_id: params.userId,
                role: params.role,
            });
            if (addError)
                throw addError;
            yield (0, activity_service_1.logSystemActivity)(this.admin, {
                projectId: params.toProjectId,
                entityType: "team",
                entityId: params.userId,
                action: "member_reassigned",
                actorId: user.id,
                actorRole: user.role,
                summary: `Reassigned team member to a different project.`,
                details: {
                    target_user_id: params.userId,
                    from_project_id: params.fromProjectId,
                    to_project_id: params.toProjectId,
                    role: params.role,
                },
            });
        });
    }
    /**
     * Provisions a new user and assigns them to a project.
     */
    createMember(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const normalizedRole = params.role === "admin" ? "project_admin" : params.role;
            if (user.role !== "super_user") {
                throw new Error("Only Super User can create new logins.");
            }
            if (!env_1.env.supabaseServiceRoleKey) {
                throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing, auth provisioning disabled.");
            }
            // 1. Create Auth User
            const { data: authData, error: authError } = yield this.admin.auth.admin.createUser({
                email: params.email,
                password: params.password,
                email_confirm: true,
                user_metadata: {
                    full_name: params.fullName,
                    company: params.company,
                },
            });
            if (authError)
                throw authError;
            // 2. Create Profile
            const { error: profileError } = yield this.admin.from("profiles").upsert({
                user_id: authData.user.id,
                email: params.email,
                full_name: params.fullName,
                company: params.company,
                global_role: normalizedRole,
            });
            if (profileError)
                throw profileError;
            // 3. Optional Project Membership
            if (params.projectId) {
                const { error: membershipError } = yield this.admin.from("project_users").insert({
                    project_id: params.projectId,
                    user_id: authData.user.id,
                    role: normalizedRole,
                });
                if (membershipError)
                    throw membershipError;
            }
            yield (0, activity_service_1.logSystemActivity)(this.admin, {
                projectId: params.projectId || null,
                entityType: "team",
                entityId: authData.user.id,
                action: "member_created",
                actorId: user.id,
                actorRole: user.role,
                summary: `Provisioned ${params.fullName} as ${normalizedRole}.`,
                details: {
                    email: params.email,
                    assigned_project_id: params.projectId || null,
                    assigned_role: normalizedRole,
                },
            });
            return authData.user;
        });
    }
    createInvite(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!["super_user", "super_admin", "project_admin", "L3", "L5"].includes(user.role)) {
                throw new Error("Only Administrators can create invites.");
            }
            const token = (0, uuid_1.v4)();
            const { error } = yield this.admin.from("project_invites").insert({
                project_id: params.projectId,
                email: params.email,
                role: params.role,
                token,
                created_by: user.id,
            });
            if (error)
                throw error;
            yield (0, activity_service_1.logSystemActivity)(this.admin, {
                projectId: params.projectId,
                entityType: "team",
                entityId: params.projectId,
                action: "invite_created",
                actorId: user.id,
                actorRole: user.role,
                summary: `Invited ${params.email} to project as ${params.role}.`,
                details: {
                    invite_email: params.email,
                    role: params.role,
                },
            });
            return token;
        });
    }
    createPlatformInvite(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!["super_user", "super_admin", "L3", "L5"].includes(user.role)) {
                throw new Error("Only Administrators can create platform invites.");
            }
            const token = (0, uuid_1.v4)();
            const { error } = yield this.admin.from("platform_invites").insert({
                email: params.email,
                role: params.role,
                token,
                created_by: user.id,
            });
            if (error)
                throw error;
            yield (0, activity_service_1.logSystemActivity)(this.admin, {
                projectId: null,
                entityType: "team",
                entityId: user.id,
                action: "platform_invite_created",
                actorId: user.id,
                actorRole: user.role,
                summary: `Invited ${params.email} to platform as ${params.role}.`,
                details: {
                    invite_email: params.email,
                    role: params.role,
                },
            });
            return token;
        });
    }
    registerFromPlatformInvite(token, params) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Fetch invite
            const { data: invite } = yield this.admin
                .from("platform_invites")
                .select("*")
                .eq("token", token)
                .maybeSingle();
            if (!invite)
                throw new Error("Invalid or expired invite.");
            if (invite.accepted_at)
                throw new Error("This invite has already been used.");
            // 2. Create Auth User
            const { data: authData, error: authError } = yield this.admin.auth.admin.createUser({
                email: invite.email,
                password: params.password,
                email_confirm: true,
                user_metadata: {
                    full_name: params.fullName,
                    company: params.company,
                },
            });
            if (authError)
                throw authError;
            // 3. Create Profile
            const { error: profileError } = yield this.admin.from("profiles").upsert({
                user_id: authData.user.id,
                email: invite.email,
                full_name: params.fullName,
                company: params.company,
                global_role: invite.role,
            });
            if (profileError)
                throw profileError;
            // 4. Mark invite as accepted
            yield this.admin
                .from("platform_invites")
                .update({
                accepted_at: new Date().toISOString(),
            })
                .eq("id", invite.id);
            return authData.user;
        });
    }
    acceptInvite(user, token) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { data: invite } = yield this.client
                .from("project_invites")
                .select("id, project_id, email, role, accepted_at")
                .eq("token", token)
                .maybeSingle();
            if (!invite)
                throw new Error("Invite not found.");
            if (((_a = user.email) !== null && _a !== void 0 ? _a : "").toLowerCase() !== invite.email.toLowerCase()) {
                throw new Error("This invite was sent to a different email address.");
            }
            if (!invite.accepted_at) {
                const { data: existingMembership } = yield this.client
                    .from("project_users")
                    .select("id")
                    .eq("project_id", invite.project_id)
                    .eq("user_id", user.id)
                    .limit(1)
                    .maybeSingle();
                if (!existingMembership) {
                    yield this.admin.from("project_users").insert({
                        project_id: invite.project_id,
                        user_id: user.id,
                        role: invite.role,
                    });
                }
                yield this.admin
                    .from("project_invites")
                    .update({
                    accepted_by: user.id,
                    accepted_at: new Date().toISOString(),
                })
                    .eq("id", invite.id);
                yield (0, activity_service_1.logSystemActivity)(this.admin, {
                    projectId: invite.project_id,
                    entityType: "team",
                    entityId: invite.id,
                    action: "invite_accepted",
                    actorId: user.id,
                    actorRole: user.role,
                    summary: `Accepted invite and joined project as ${invite.role}.`,
                    details: {
                        invite_email: invite.email,
                        role: invite.role,
                    },
                });
            }
            return invite.project_id;
        });
    }
}
exports.MemberService = MemberService;
exports.memberService = new MemberService();
