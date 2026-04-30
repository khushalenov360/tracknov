import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logSystemActivity } from "./activity-service";
import type { CurrentUser } from "@/lib/types";

export class MemberService {
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  async removeMember(user: CurrentUser, params: {
    projectId: string;
    userId: string;
  }) {
    const { error } = await this.admin
      .from("project_members")
      .delete()
      .eq("project_id", params.projectId)
      .eq("user_id", params.userId);

    if (error) throw error;
  }

  /**
   * Provisions a new user and assigns them to a project.
   */
  async createMember(user: CurrentUser, params: {
    fullName: string;
    email: string;
    company: string;
    role: string;
    password?: string;
    projectId?: string;
  }) {
    // RBAC
    const actorRole = user.role;
    const allowedBySuperUser = ["super_admin", "project_admin", "client", "owner", "consultant", "architect", "mep", "contractor"];
    const allowedBySuperAdmin = ["client", "owner", "consultant", "architect", "mep", "contractor"];
    const allowedByProjectAdmin = ["client", "owner", "consultant"];
    const allowedByClient = ["owner"];
    const allowedByOwner = ["architect", "mep", "contractor"];

    const actingAsSuperUser = actorRole === "super_user";
    const actingAsSuperAdmin = actorRole === "super_admin";
    const actingAsProjectAdmin = actorRole === "project_admin";
    const actingAsClient = actorRole === "client";
    const actingAsOwner = actorRole === "owner";

    const normalizedRole = params.role === "admin" ? "project_admin" : params.role;

    if (!actingAsSuperUser && !actingAsSuperAdmin && !actingAsProjectAdmin && !actingAsClient && !actingAsOwner) {
      throw new Error("You do not have permission to create new logins.");
    }

    if (!env.supabaseServiceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing, auth provisioning disabled.");
    }

    // 1. Create Auth User
    const { data: authData, error: authError } = await this.admin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: {
        full_name: params.fullName,
        company: params.company,
      },
    });

    if (authError) throw authError;

    // 2. Create Profile
    const { error: profileError } = await this.admin.from("profiles").upsert({
      user_id: authData.user.id,
      email: params.email,
      full_name: params.fullName,
      company: params.company,
      global_role: normalizedRole,
    });

    if (profileError) throw profileError;

    // 3. Optional Project Membership
    if (params.projectId) {
      const { error: membershipError } = await this.admin.from("project_members").insert({
        project_id: params.projectId,
        user_id: authData.user.id,
        role: normalizedRole,
      });
      if (membershipError) throw membershipError;
    }

    await logSystemActivity(this.admin, {
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
  }

  async acceptInvite(user: CurrentUser, token: string) {
    const { data: invite } = await this.client
      .from("project_invites")
      .select("id, project_id, email, role, accepted_at")
      .eq("token", token)
      .maybeSingle();

    if (!invite) throw new Error("Invite not found.");

    if ((user.email ?? "").toLowerCase() !== invite.email.toLowerCase()) {
      throw new Error("This invite was sent to a different email address.");
    }

    if (!invite.accepted_at) {
      const { data: existingMembership } = await this.client
        .from("project_members")
        .select("id")
        .eq("project_id", invite.project_id)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!existingMembership) {
        await this.admin.from("project_members").insert({
          project_id: invite.project_id,
          user_id: user.id,
          role: invite.role,
        });
      }

      await this.admin
        .from("project_invites")
        .update({
          accepted_by: user.id,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      await logSystemActivity(this.admin, {
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
  }
}

export const memberService = new MemberService();
