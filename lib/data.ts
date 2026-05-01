import { redirect } from "next/navigation";
import { buildSeedCredits } from "@/lib/catalog";
import { categoryMeta, igbcRatingSystems } from "@/lib/constants";
import { env } from "@/lib/env";
import {
  canCreateProjects,
  canDeleteProjects,
  canEditDocumentStatusAtAnyStage,
  canEditOwnDocumentBeforeFinalApproval,
  canManageProject,
  canUploadProjectDocuments,
} from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  AuditTimelineRecord,
  DocumentActivityLog,
  CreditWorkspace,
  CurrentUser,
  DocumentLibraryRecord,
  DocumentRecord,
  DocumentRequirement,
  MemberRole,
  OnboardingChecklist,
  ProjectInviteRecord,
  ProjectMemberRecord,
  ProjectStatus,
  ProjectSummary,
  ProjectType,
  ProjectWorkspace,
  RemarkRecord,
  SystemActivityLog,
  TeamMemberRecord,
} from "@/lib/types";

type SupabaseClient = ReturnType<typeof createClient>;
const greenInteriorsSystem = "IGBC Green Interiors";

function normalizeRole(role: string): MemberRole {
  if (role === "superuser") {
    return "super_user";
  }
  if (role === "admin") {
    return "super_admin";
  }
  const supported = ["super_user", "l4_reserved", "owner", "client", "consultant", "architect", "mep", "contractor", "project_admin", "super_admin"];
  return supported.includes(role) ? (role as MemberRole) : "consultant";
}

function normalizeProjectStatus(status?: string | null): ProjectStatus {
  return status === "on_hold" || status === "completed" || status === "archived" ? status : "active";
}

function normalizeProjectType(type?: string | null): ProjectType {
  const supported = ["residential", "commercial", "industrial", "infrastructure", "mixed_use"];
  return supported.includes(type ?? "") ? (type as ProjectType) : "commercial";
}

type WorkflowState =
  | "DRAFT"
  | "READY"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CLARIFICATION"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED";

function normalizeWorkflowState(state?: string | null, legacyStatus?: string | null): WorkflowState {
  const raw = String(state ?? "").toUpperCase();
  if (
    raw === "DRAFT" ||
    raw === "READY" ||
    raw === "SUBMITTED" ||
    raw === "UNDER_REVIEW" ||
    raw === "CLARIFICATION" ||
    raw === "RESUBMITTED" ||
    raw === "APPROVED" ||
    raw === "REJECTED"
  ) {
    return raw;
  }

  const legacy = String(legacyStatus ?? "").toLowerCase();
  if (legacy === "owner_approved") return "UNDER_REVIEW";
  if (legacy === "approved") return "APPROVED";
  if (legacy === "rejected") return "REJECTED";
  return "READY";
}

function workflowToLegacyStatus(state: WorkflowState): "uploaded" | "owner_approved" | "approved" | "rejected" {
  if (state === "CLARIFICATION" || state === "REJECTED") return "rejected";
  if (state === "UNDER_REVIEW") return "owner_approved";
  if (state === "APPROVED") return "approved";
  return "uploaded";
}

function deriveCreditLifecycleState(
  credit: Record<string, any>,
  documents: Array<Record<string, any>>,
): { status: CreditWorkspace["status"]; completion_pct: number } {
  const requiredTypes = new Set(
    ((credit.documents_required ?? []) as DocumentRequirement[])
      .filter((entry) => entry.required && entry.type)
      .map((entry) => entry.type),
  );
  const states = documents.map((document) =>
    normalizeWorkflowState(document.workflow_state, document.status),
  );
  const approvedTypes = new Set(
    documents
      .filter((document) => normalizeWorkflowState(document.workflow_state, document.status) === "APPROVED")
      .map((document) => String(document.doc_category ?? "").trim())
      .filter(Boolean),
  );

  const completionPct = requiredTypes.size
    ? Math.round((Array.from(requiredTypes).filter((type) => approvedTypes.has(type)).length / requiredTypes.size) * 100)
    : states.some((state) => state === "APPROVED")
      ? 100
      : states.length
        ? 25
        : 0;

  let status: CreditWorkspace["status"] = "pending";
  if (credit.blocked_by) {
    status = "blocked";
  } else if (completionPct >= 100) {
    status = "complete";
  } else if (states.some((state) => state === "REJECTED" || state === "CLARIFICATION")) {
    status = "blocked";
  } else if (states.length > 0) {
    status = "in_progress";
  }

  return { status, completion_pct: completionPct };
}

function mapCredit(
  credit: Record<string, any>,
  documents: Record<string, any>[],
  remarks: Record<string, any>[],
): CreditWorkspace {
  const creditDocuments = documents.filter((document) => document.credit_id === credit.id) as DocumentRecord[];
  const derived = deriveCreditLifecycleState(credit, creditDocuments as unknown as Record<string, any>[]);
  return {
    id: credit.id,
    project_credit_id: credit.project_credit_id ?? credit.id,
    project_id: credit.project_id,
    credit_code: credit.credit_code,
    category: credit.category,
    credit_name: credit.credit_name,
    responsible_role: credit.responsible_role ? normalizeRole(credit.responsible_role) : null,
    is_mandatory: credit.is_mandatory,
    documents_required: (credit.documents_required ?? []) as DocumentRequirement[],
    status: derived.status,
    blocked_by: credit.blocked_by,
    completion_pct: derived.completion_pct,
    documentation_summary: credit.documentation_summary,
    what_to_submit: credit.what_to_submit,
    sample_document_url: credit.sample_document_url,
    effort_level: credit.effort_level,
    effort_guidance: credit.effort_guidance,
    na: credit.na,
    documents: creditDocuments,
    remarks: remarks.filter((remark) => remark.credit_id === credit.id) as RemarkRecord[],
  };
}

async function getSupabaseUser(client: SupabaseClient) {
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

async function getProjectMembers(
  client: any,
  projectId: string,
): Promise<ProjectMemberRecord[]> {
  const { data: memberships } = await client
    .from("project_members")
    .select("id, project_id, user_id, role, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const rows = memberships ?? [];
  const userIds = Array.from(new Set(rows.map((row: any) => row.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await client.from("profiles").select("user_id, email").in("user_id", userIds)
    : { data: [] };
  const emailByUserId = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile.email]));

  return rows.map((row: any) => ({
    id: row.id,
    project_id: row.project_id,
    user_id: row.user_id,
    member_email: emailByUserId.get(row.user_id) ?? null,
    role: normalizeRole(row.role),
    created_at: row.created_at,
  }));
}

async function getProjectInvites(
  client: any,
  projectId: string,
): Promise<ProjectInviteRecord[]> {
  const { data: invites } = await client
    .from("project_invites")
    .select("id, project_id, email, role, token, created_by, accepted_by, accepted_at, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (invites ?? []).map((invite: any) => ({
    id: invite.id,
    project_id: invite.project_id,
    email: invite.email,
    role: normalizeRole(invite.role) as ProjectInviteRecord["role"],
    token: invite.token,
    created_by: invite.created_by,
    accepted_by: invite.accepted_by,
    accepted_at: invite.accepted_at,
    created_at: invite.created_at,
  }));
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!env.isConfigured) {
    return null;
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return null;
  }

  const { data: profile } = await client
    .from("profiles")
    .select("global_role, disabled_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.disabled_at) {
    return null;
  }
  if (profile?.global_role) {
    return { id: user.id, email: user.email ?? "", role: normalizeRole(profile.global_role) };
  }

  const metadataRole =
    typeof user.user_metadata?.role === "string"
      ? normalizeRole(user.user_metadata.role)
      : null;
  if (metadataRole) {
    return {
      id: user.id,
      email: user.email ?? "",
      role: metadataRole,
    };
  }

  const { data: elevatedMembership } = await client
    .from("project_members")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["super_user", "super_admin", "project_admin", "admin"])
    .limit(1)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    role: normalizeRole(elevatedMembership?.role ?? "consultant"),
  };
}

export async function getDashboardProjects() {
  if (!env.isConfigured) {
    return [];
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return [];
  }

  const currentUser = await getCurrentUser();
  if (currentUser?.role === "super_user" && env.supabaseServiceRoleKey) {
    const admin = createAdminClient();
    const { data: projects } = await admin
      .from("projects")
      .select("id, name, client, location, project_type, status, green_certification, igbc_variant, certification_type, target_rating, created_at")
      .order("created_at", { ascending: false });
    const projectIds = (projects ?? []).map((project: any) => project.id);
    const { data: usageRows } = projectIds.length
      ? await admin
          .from("project_usage_summary")
          .select("project_id, plan_code, plan_name, monthly_price_inr, document_credit_limit, consultant_credit_limit, documents_used, consultant_sessions_used, documents_remaining, consultant_credits_remaining")
          .in("project_id", projectIds)
      : { data: [] };
    const usageByProjectId = new Map((usageRows ?? []).map((row: any) => [row.project_id, row]));

    const summaries = await Promise.all(
      (projects ?? []).map(async (project: any) => {
        const projectId = project.id;
        const usage = usageByProjectId.get(projectId);
        const { data: credits } = await admin
          .from("credits")
          .select("id, is_mandatory, status, completion_pct, documents_required, blocked_by")
          .eq("project_id", projectId);
        const creditIds = (credits ?? []).map((credit: any) => credit.id);
        const [{ count: docsCount }, { count: remarksCount }, { count: membersCount }, { count: pendingOwnerCount }, { count: pendingAdminCount }, { count: rejectedCount }, { data: projectDocuments }] = await Promise.all([
          admin.from("documents").select("*", { count: "exact", head: true }).eq("project_id", projectId),
          creditIds.length
            ? admin.from("remarks").select("*", { count: "exact", head: true }).in("credit_id", creditIds)
            : Promise.resolve({ count: 0 }),
          admin.from("project_members").select("*", { count: "exact", head: true }).eq("project_id", projectId),
          admin.from("documents").select("*", { count: "exact", head: true }).eq("project_id", projectId).eq("workflow_state", "SUBMITTED"),
          admin.from("documents").select("*", { count: "exact", head: true }).eq("project_id", projectId).eq("workflow_state", "UNDER_REVIEW"),
          admin.from("documents").select("*", { count: "exact", head: true }).eq("project_id", projectId).in("workflow_state", ["REJECTED", "CLARIFICATION"]),
          admin.from("documents").select("credit_id, workflow_state, status, doc_category").eq("project_id", projectId),
        ]);
        const creditRows = credits ?? [];
        const derivedCredits = creditRows.map((credit: any) => {
          const documentsForCredit = (projectDocuments ?? []).filter(
            (document: any) => document.credit_id === credit.id,
          );
          return deriveCreditLifecycleState(credit, documentsForCredit);
        });
        const overallCompletion =
          derivedCredits.reduce((sum: number, credit) => sum + Number(credit.completion_pct ?? 0), 0) /
          Math.max(derivedCredits.length, 1);
        const mandatoryMet = creditRows.filter((credit: any, index: number) => credit.is_mandatory && derivedCredits[index]?.status === "complete").length;

        return {
          id: project.id,
          name: project.name,
          client: project.client ?? "",
          location: project.location ?? "",
          project_type: normalizeProjectType(project.project_type),
          status: normalizeProjectStatus(project.status),
          green_certification: project.green_certification ?? "IGBC",
          igbc_variant: project.igbc_variant === "existing" ? "existing" : "new",
          certification_type: project.certification_type,
          target_rating: project.target_rating,
          created_at: project.created_at,
          role: "super_user",
          overallCompletion,
          totalCredits: creditRows.length,
          uploadedDocs: docsCount ?? 0,
          mandatoryCreditsMet: mandatoryMet,
          openRemarks: remarksCount ?? 0,
          membersCount: membersCount ?? 0,
          planCode: usage?.plan_code ?? "starter",
          planName: usage?.plan_name ?? "Starter",
          monthlyPriceInr: Number(usage?.monthly_price_inr ?? 0),
          documentCreditLimit: Number(usage?.document_credit_limit ?? 0),
          consultantCreditLimit: Number(usage?.consultant_credit_limit ?? 0),
          documentCreditsUsed: Number(usage?.documents_used ?? 0),
          consultantCreditsUsed: Number(usage?.consultant_sessions_used ?? 0),
          documentCreditsRemaining: Number(usage?.documents_remaining ?? 0),
          consultantCreditsRemaining: Number(usage?.consultant_credits_remaining ?? 0),
          pendingReviewsCount: Number(pendingOwnerCount ?? 0) + Number(pendingAdminCount ?? 0),
          rejectedCount: Number(rejectedCount ?? 0),
          statusFlag:
            Number(rejectedCount ?? 0) >= 3 || Number(pendingOwnerCount ?? 0) + Number(pendingAdminCount ?? 0) >= 8
              ? "red"
              : Number(rejectedCount ?? 0) >= 1 || Number(pendingOwnerCount ?? 0) + Number(pendingAdminCount ?? 0) >= 3
                ? "amber"
                : "green",
        } satisfies ProjectSummary;
      }),
    );

    return summaries;
  }

  const { data: memberships } = await client
    .from("project_members")
    .select("project_id, role, projects(id, name, client, location, project_type, status, green_certification, igbc_variant, certification_type, target_rating, created_at)")
    .eq("user_id", user.id);

  const projects = memberships ?? [];
  const projectIds = projects.map((membership) => membership.project_id);
  const { data: usageRows } = projectIds.length
    ? await client
        .from("project_usage_summary")
        .select("project_id, plan_code, plan_name, monthly_price_inr, document_credit_limit, consultant_credit_limit, documents_used, consultant_sessions_used, documents_remaining, consultant_credits_remaining")
        .in("project_id", projectIds)
    : { data: [] };
  const usageByProjectId = new Map((usageRows ?? []).map((row: any) => [row.project_id, row]));

  const summaries = await Promise.all(
    projects.map(async (membership) => {
      const projectId = membership.project_id;
      const usage = usageByProjectId.get(projectId);
      const { data: credits } = await client
        .from("credits")
        .select("id, is_mandatory, status, completion_pct, documents_required, blocked_by")
        .eq("project_id", projectId);
      const creditIds = (credits ?? []).map((credit) => credit.id);
      const [{ count: docsCount }, { count: remarksCount }, { count: membersCount }, { count: pendingOwnerCount }, { count: pendingAdminCount }, { count: rejectedCount }, { data: projectDocuments }] = await Promise.all([
        client.from("documents").select("*", { count: "exact", head: true }).eq("project_id", projectId),
        creditIds.length
          ? client.from("remarks").select("*", { count: "exact", head: true }).in("credit_id", creditIds)
          : Promise.resolve({ count: 0 }),
        client.from("project_members").select("*", { count: "exact", head: true }).eq("project_id", projectId),
        client.from("documents").select("*", { count: "exact", head: true }).eq("project_id", projectId).eq("workflow_state", "SUBMITTED"),
        client.from("documents").select("*", { count: "exact", head: true }).eq("project_id", projectId).eq("workflow_state", "UNDER_REVIEW"),
        client.from("documents").select("*", { count: "exact", head: true }).in("workflow_state", ["REJECTED", "CLARIFICATION"]),
        client.from("documents").select("credit_id, workflow_state, status, doc_category").eq("project_id", projectId),
      ]);
      const creditRows = credits ?? [];
      const derivedCredits = creditRows.map((credit: any) => {
        const documentsForCredit = (projectDocuments ?? []).filter(
          (document: any) => document.credit_id === credit.id,
        );
        return deriveCreditLifecycleState(credit, documentsForCredit);
      });
      const overallCompletion =
        derivedCredits.reduce((sum: number, credit) => sum + Number(credit.completion_pct ?? 0), 0) /
        Math.max(derivedCredits.length, 1);
      const mandatoryMet = creditRows.filter((credit: any, index: number) => credit.is_mandatory && derivedCredits[index]?.status === "complete").length;
      const project = Array.isArray(membership.projects) ? membership.projects[0] : membership.projects;

      return {
        id: project.id,
        name: project.name,
        client: project.client ?? "",
        location: project.location ?? "",
        project_type: normalizeProjectType(project.project_type),
        status: normalizeProjectStatus(project.status),
        green_certification: project.green_certification ?? "IGBC",
        igbc_variant: project.igbc_variant === "existing" ? "existing" : "new",
        certification_type: project.certification_type,
        target_rating: project.target_rating,
        created_at: project.created_at,
        role: normalizeRole(membership.role),
        overallCompletion,
        totalCredits: creditRows.length,
        uploadedDocs: docsCount ?? 0,
        mandatoryCreditsMet: mandatoryMet,
        openRemarks: remarksCount ?? 0,
        membersCount: membersCount ?? 0,
        planCode: usage?.plan_code ?? "starter",
        planName: usage?.plan_name ?? "Starter",
        monthlyPriceInr: Number(usage?.monthly_price_inr ?? 0),
        documentCreditLimit: Number(usage?.document_credit_limit ?? 0),
        consultantCreditLimit: Number(usage?.consultant_credit_limit ?? 0),
        documentCreditsUsed: Number(usage?.documents_used ?? 0),
        consultantCreditsUsed: Number(usage?.consultant_sessions_used ?? 0),
        documentCreditsRemaining: Number(usage?.documents_remaining ?? 0),
        consultantCreditsRemaining: Number(usage?.consultant_credits_remaining ?? 0),
        pendingReviewsCount: Number(pendingOwnerCount ?? 0) + Number(pendingAdminCount ?? 0),
        rejectedCount: Number(rejectedCount ?? 0),
        statusFlag:
          Number(rejectedCount ?? 0) >= 3 || Number(pendingOwnerCount ?? 0) + Number(pendingAdminCount ?? 0) >= 8
            ? "red"
            : Number(rejectedCount ?? 0) >= 1 || Number(pendingOwnerCount ?? 0) + Number(pendingAdminCount ?? 0) >= 3
              ? "amber"
              : "green",
      } satisfies ProjectSummary;
    }),
  );

  return summaries;
}

export async function getProjectWorkspace(projectId: string) {
  if (!env.isConfigured) {
    return null;
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return null;
  }

  const currentUser = await getCurrentUser();
  if (currentUser?.role === "super_user" && env.supabaseServiceRoleKey) {
    const admin = createAdminClient();
    const [{ data: project }, { data: credits }, { data: documents }, { data: notifications }, { data: activityLogs }, members, invites] =
      await Promise.all([
        admin.from("projects").select("*").eq("id", projectId).single(),
        admin.from("credits").select("*").eq("project_id", projectId).order("credit_code"),
        admin
          .from("documents")
          .select("*")
          .eq("project_id", projectId)
          .order("uploaded_at", { ascending: false }),
        admin
          .from("notifications")
          .select("id, body, action_url, created_at, read_at")
          .eq("user_id", user.id)
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        admin
          .from("system_activity_logs")
          .select("id, project_id, entity_type, entity_id, action, actor_id, actor_role, summary, details, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(25),
        getProjectMembers(admin, projectId),
        getProjectInvites(admin, projectId),
      ]);
    const creditIds = (credits ?? []).map((credit: any) => credit.id);
    const { data: remarks } = creditIds.length
      ? await admin.from("remarks").select("*").in("credit_id", creditIds).order("created_at", { ascending: false })
      : { data: [] };

    const mappedCredits = (credits ?? []).map((credit: any) => mapCredit(credit, documents ?? [], remarks ?? []));

    return {
      project,
      userRole: "super_user",
      credits: mappedCredits,
      members,
      invites,
      notifications: notifications ?? [],
      activityLogs: ((activityLogs ?? []) as Array<SystemActivityLog>).map((row) => ({
        ...row,
        details: row.details ?? {},
      })),
    } satisfies ProjectWorkspace;
  }

  const { data: membership } = await client
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return null;
  }

  const [{ data: project }, { data: credits }, { data: documents }, { data: notifications }, { data: activityLogs }, members, invites] =
    await Promise.all([
      client.from("projects").select("*").eq("id", projectId).single(),
      client.from("credits").select("*").eq("project_id", projectId).order("credit_code"),
      client
        .from("documents")
        .select("*")
        .eq("project_id", projectId)
        .order("uploaded_at", { ascending: false }),
      client
        .from("notifications")
        .select("id, body, action_url, created_at, read_at")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      client
        .from("system_activity_logs")
        .select("id, project_id, entity_type, entity_id, action, actor_id, actor_role, summary, details, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(25),
      getProjectMembers(client, projectId),
      getProjectInvites(client, projectId),
    ]);
  const creditIds = (credits ?? []).map((credit) => credit.id);
  const { data: remarks } = creditIds.length
    ? await client.from("remarks").select("*").in("credit_id", creditIds).order("created_at", { ascending: false })
    : { data: [] };

  const mappedCredits = (credits ?? []).map((credit) => mapCredit(credit, documents ?? [], remarks ?? []));

  return {
    project,
    userRole: normalizeRole(membership.role),
    credits: mappedCredits,
    members,
    invites,
    notifications: notifications ?? [],
    activityLogs: ((activityLogs ?? []) as Array<SystemActivityLog>).map((row) => ({
      ...row,
      details: row.details ?? {},
    })),
  } satisfies ProjectWorkspace;
}

export async function getProjectWorkspaceForApi(projectId: string): Promise<ProjectWorkspace | null> {
  if (!env.isConfigured) {
    return null;
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return null;
  }

  const currentUser = await getCurrentUser();
  if (currentUser?.role === "super_user") {
    return getProjectWorkspace(projectId);
  }

  const { data: membership } = await client
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return null;
  }

  return getProjectWorkspace(projectId);
}

export async function getSubmissionWorkspace(projectId: string) {
  const workspace = await getProjectWorkspace(projectId);
  if (!workspace) return null;
  return {
    ...workspace,
    credits: workspace.credits.filter((credit) => credit.status === "complete"),
  };
}

export function creditStats(credits: CreditWorkspace[]) {
  const total = credits.length;
  const mandatory = credits.filter((credit) => credit.is_mandatory);
  const docs = credits.reduce((sum, credit) => sum + credit.documents.length, 0);

  return {
    total,
    docs,
    categories: Object.entries(categoryMeta).map(([key, meta]) => ({
      key,
      label: meta.label,
      count: credits.filter((credit) => credit.category === key).length,
    })),
    mandatoryMet: mandatory.filter((credit) => credit.status === "complete").length,
    mandatoryTotal: mandatory.length,
  };
}

export async function createProjectForCurrentUser({
  name,
  ratingSystem,
  targetRating = "Certified",
  clientName = "",
  location = "",
  projectType = "commercial",
  status = "active",
  greenCertification = "IGBC",
  igbcVariant = "new",
}: {
  name: string;
  ratingSystem: string;
  targetRating?: string;
  clientName?: string;
  location?: string;
  projectType?: string;
  status?: string;
  greenCertification?: string;
  igbcVariant?: string;
}) {
  if (!env.isConfigured) {
    return null;
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return null;
  }
  const currentUser = await getCurrentUser();
  if (!canCreateProjects(currentUser?.role)) {
    return null;
  }
  const elevatedClient =
    env.supabaseServiceRoleKey && canCreateProjects(currentUser?.role)
      ? createAdminClient()
      : client;

  const safeRatingSystem = igbcRatingSystems.includes(ratingSystem as any)
    ? ratingSystem
    : greenInteriorsSystem;

  const { data: project, error: projectError } = await elevatedClient
    .from("projects")
    .insert({
      name,
      client: clientName,
      location,
      project_type: projectType,
      status,
      green_certification: greenCertification,
      igbc_variant: igbcVariant,
      target_rating: targetRating,
      certification_type: safeRatingSystem,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    throw projectError ?? new Error("Could not create project");
  }

  const membershipError = await elevatedClient.from("project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: currentUser?.role === "super_user" ? "super_user" : "super_admin",
  });

  if (membershipError.error) {
    throw membershipError.error;
  }

  if (safeRatingSystem === greenInteriorsSystem) {
    const { data: createdCredits, error: creditsError } = await elevatedClient
      .from("credits")
      .insert(buildSeedCredits(project.id))
      .select("id, project_id");
    if (creditsError) {
      throw creditsError;
    }
    if ((createdCredits ?? []).length) {
      const { error: projectCreditError } = await elevatedClient.from("project_credits").insert(
        (createdCredits ?? []).map((credit: any) => ({
          project_id: credit.project_id,
          credit_id: credit.id,
        })),
      );
      if (projectCreditError) {
        throw projectCreditError;
      }
    }
  }

  const { data: starterPlan } = await elevatedClient
    .from("subscription_plans")
    .select("code, document_credit_limit, consultant_credit_limit")
    .eq("code", "starter")
    .maybeSingle();
  const defaultPlanCode = starterPlan?.code ?? "starter";
  const defaultDocumentLimit = Number(starterPlan?.document_credit_limit ?? 250);
  const defaultConsultantLimit = Number(starterPlan?.consultant_credit_limit ?? 40);
  const { error: billingError } = await elevatedClient.from("project_billing_settings").upsert(
    {
      project_id: project.id,
      plan_code: defaultPlanCode,
      document_credit_limit: defaultDocumentLimit,
      consultant_credit_limit: defaultConsultantLimit,
      updated_by: user.id,
    },
    { onConflict: "project_id" },
  );
  if (billingError) {
    throw billingError;
  }

  return project;
}

export async function getActiveSubscriptionPlans() {
  if (!env.isConfigured) {
    return [] as Array<{
      code: string;
      name: string;
      monthly_price_inr: number;
      document_credit_limit: number;
      consultant_credit_limit: number;
    }>;
  }

  const client = createClient();
  const { data } = await client
    .from("subscription_plans")
    .select("code, name, monthly_price_inr, document_credit_limit, consultant_credit_limit")
    .eq("is_active", true)
    .order("monthly_price_inr", { ascending: true });

  return (data ?? []) as Array<{
    code: string;
    name: string;
    monthly_price_inr: number;
    document_credit_limit: number;
    consultant_credit_limit: number;
  }>;
}

const defaultOnboardingChecklist: OnboardingChecklist = {
  profile_completed: false,
  project_scope_confirmed: false,
  first_document_uploaded: false,
  first_review_completed: false,
};

export async function getOrCreateOnboardingChecklist(projectId: string) {
  if (!env.isConfigured) {
    return null;
  }
  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return null;
  }

  const { data: existing } = await client
    .from("onboarding_checklists")
    .select("id, checklist, completed_at")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id as string,
      checklist: { ...defaultOnboardingChecklist, ...(existing.checklist ?? {}) } as OnboardingChecklist,
      completedAt: existing.completed_at as string | null,
    };
  }

  const { data: inserted, error } = await client
    .from("onboarding_checklists")
    .insert({
      user_id: user.id,
      project_id: projectId,
      checklist: defaultOnboardingChecklist,
    })
    .select("id, checklist, completed_at")
    .single();

  if (error || !inserted) {
    return null;
  }

  return {
    id: inserted.id as string,
    checklist: { ...defaultOnboardingChecklist, ...(inserted.checklist ?? {}) } as OnboardingChecklist,
    completedAt: inserted.completed_at as string | null,
  };
}

export async function updateOnboardingChecklistForCurrentUser(projectId: string, key: keyof OnboardingChecklist, value: boolean) {
  if (!env.isConfigured) {
    return;
  }
  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return;
  }

  const existing = await getOrCreateOnboardingChecklist(projectId);
  if (!existing) {
    return;
  }

  const nextChecklist = {
    ...existing.checklist,
    [key]: value,
  };
  const completed = Object.values(nextChecklist).every(Boolean);

  await client
    .from("onboarding_checklists")
    .update({
      checklist: nextChecklist,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
}

async function getMembershipRoleForProject(client: SupabaseClient, userId: string, projectId: string) {
  const { data: membership } = await client
    .from("project_members")
    .select("role")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .limit(1)
    .maybeSingle();

  return normalizeRole(membership?.role ?? "consultant");
}

export async function updateProjectForCurrentUser({
  projectId,
  name,
  clientName,
  location,
  ratingSystem,
  status,
}: {
  projectId: string;
  name: string;
  clientName: string;
  location: string;
  ratingSystem: string;
  status: string;
}) {
  if (!env.isConfigured) {
    return;
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return;
  }

  const currentUser = await getCurrentUser();
  const projectRole =
    currentUser?.role === "super_user"
      ? "super_user"
      : await getMembershipRoleForProject(client, user.id, projectId);

  if (!canManageProject(projectRole)) {
    return;
  }

  const elevatedClient =
    env.supabaseServiceRoleKey && canManageProject(projectRole) ? createAdminClient() : client;
  const safeRatingSystem = igbcRatingSystems.includes(ratingSystem as any) ? ratingSystem : greenInteriorsSystem;

  const { error } = await elevatedClient
    .from("projects")
    .update({
      name,
      client: clientName,
      location,
      certification_type: safeRatingSystem,
      status,
    })
    .eq("id", projectId);

  if (error) {
    throw error;
  }
}

export async function updateProjectBillingSettingsForCurrentUser({
  projectId,
  planCode,
  documentCreditLimit,
  consultantCreditLimit,
  topupDocumentCredits,
  topupConsultantCredits,
}: {
  projectId: string;
  planCode: string;
  documentCreditLimit: number;
  consultantCreditLimit: number;
  topupDocumentCredits: number;
  topupConsultantCredits: number;
}) {
  if (!env.isConfigured) {
    return;
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return;
  }

  const currentUser = await getCurrentUser();
  const projectRole =
    currentUser?.role === "super_user"
      ? "super_user"
      : await getMembershipRoleForProject(client, user.id, projectId);

  if (!canManageProject(projectRole)) {
    return;
  }

  const elevatedClient =
    env.supabaseServiceRoleKey && canManageProject(projectRole) ? createAdminClient() : client;

  const { error } = await elevatedClient.from("project_billing_settings").upsert(
    {
      project_id: projectId,
      plan_code: planCode,
      document_credit_limit: Math.max(0, Math.trunc(documentCreditLimit)),
      consultant_credit_limit: Math.max(0, Math.trunc(consultantCreditLimit)),
      topup_document_credits: Math.max(0, Math.trunc(topupDocumentCredits)),
      topup_consultant_credits: Math.max(0, Math.trunc(topupConsultantCredits)),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );

  if (error) {
    throw error;
  }
}

export async function logConsultantSessionForCurrentUser({
  projectId,
  source,
  notes,
  creditsBurned,
}: {
  projectId: string;
  source: string;
  notes: string;
  creditsBurned: number;
}) {
  if (!env.isConfigured) {
    return;
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return;
  }

  const currentUser = await getCurrentUser();
  const projectRole =
    currentUser?.role === "super_user"
      ? "super_user"
      : await getMembershipRoleForProject(client, user.id, projectId);

  if (!projectRole) {
    return;
  }

  const elevatedClient = env.supabaseServiceRoleKey ? createAdminClient() : client;
  const { data: usage } = await elevatedClient
    .from("project_usage_summary")
    .select("consultant_credit_limit, topup_consultant_credits, consultant_sessions_used")
    .eq("project_id", projectId)
    .maybeSingle();

  const totalCredits =
    Number(usage?.consultant_credit_limit ?? 0) + Number(usage?.topup_consultant_credits ?? 0);
  const usedCredits = Number(usage?.consultant_sessions_used ?? 0);
  const burn = Math.max(1, Math.trunc(creditsBurned || 1));

  if (totalCredits > 0 && usedCredits + burn > totalCredits) {
    throw new Error("Consultant credit limit reached. Add consultant top-up credits or update plan quota.");
  }

  const { error } = await elevatedClient.from("consultant_sessions").insert({
    project_id: projectId,
    actor_id: user.id,
    source: source || "manual",
    notes: notes || "",
    credits_burned: burn,
  });

  if (error) {
    throw error;
  }
}

export async function createProjectTopupInvoiceForCurrentUser({
  projectId,
  documentCredits,
  consultantCredits,
  amountInr,
  notes,
}: {
  projectId: string;
  documentCredits: number;
  consultantCredits: number;
  amountInr: number;
  notes: string;
}) {
  if (!env.isConfigured) {
    return;
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return;
  }

  const currentUser = await getCurrentUser();
  const projectRole =
    currentUser?.role === "super_user"
      ? "super_user"
      : await getMembershipRoleForProject(client, user.id, projectId);

  if (!canManageProject(projectRole)) {
    return;
  }

  const elevatedClient =
    env.supabaseServiceRoleKey && canManageProject(projectRole) ? createAdminClient() : client;

  const docTopup = Math.max(0, Math.trunc(documentCredits || 0));
  const consultantTopup = Math.max(0, Math.trunc(consultantCredits || 0));
  const safeAmount = Number(Math.max(0, amountInr || 0).toFixed(2));

  if (docTopup === 0 && consultantTopup === 0) {
    throw new Error("Top-up credits are required.");
  }

  const { data: existingSettings } = await elevatedClient
    .from("project_billing_settings")
    .select("project_id, topup_document_credits, topup_consultant_credits")
    .eq("project_id", projectId)
    .maybeSingle();

  const nextDocTopup = Number(existingSettings?.topup_document_credits ?? 0) + docTopup;
  const nextConsultantTopup = Number(existingSettings?.topup_consultant_credits ?? 0) + consultantTopup;

  const { error: settingsError } = await elevatedClient
    .from("project_billing_settings")
    .update({
      topup_document_credits: nextDocTopup,
      topup_consultant_credits: nextConsultantTopup,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);

  if (settingsError) {
    throw settingsError;
  }

  const { error: topupError } = await elevatedClient.from("project_topups").insert({
    project_id: projectId,
    document_credits: docTopup,
    consultant_credits: consultantTopup,
    amount_inr: safeAmount,
    notes: notes || "",
    created_by: user.id,
  });
  if (topupError) {
    throw topupError;
  }

  const now = new Date();
  const invoiceNumber = `TRK-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const lineItems = [
    {
      item: "Document credit top-up",
      quantity: docTopup,
      unit: "credits",
    },
    {
      item: "Consultant credit top-up",
      quantity: consultantTopup,
      unit: "credits",
    },
  ].filter((item) => item.quantity > 0);
  const dueAt = new Date(now);
  dueAt.setDate(now.getDate() + 15);

  const { error: invoiceError } = await elevatedClient.from("billing_invoices").insert({
    project_id: projectId,
    invoice_number: invoiceNumber,
    status: "issued",
    line_items: lineItems,
    subtotal_inr: safeAmount,
    tax_inr: 0,
    total_inr: safeAmount,
    currency: "INR",
    issued_at: now.toISOString(),
    due_at: dueAt.toISOString(),
    created_by: user.id,
  });
  if (invoiceError) {
    throw invoiceError;
  }
}

export async function deleteProjectForCurrentUser(projectId: string) {
  if (!env.isConfigured) {
    return;
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return;
  }

  const currentUser = await getCurrentUser();
  if (!canDeleteProjects(currentUser?.role)) {
    return;
  }

  const elevatedClient = env.supabaseServiceRoleKey ? createAdminClient() : client;
  const { error } = await elevatedClient.from("projects").delete().eq("id", projectId);

  if (error) {
    throw error;
  }
}

export async function getDocumentLibrary(filters: {
  project?: string;
  status?: string;
  search?: string;
} = {}) {
  if (!env.isConfigured) {
    return [];
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return [];
  }
  const currentUser = await getCurrentUser();

  let query = client.from("documents").select("*").order("uploaded_at", { ascending: false });
  if (filters.project) {
    query = query.eq("project_id", filters.project);
  }

  const { data: documents } = await query;
  const rows = (documents ?? []) as DocumentRecord[];
  const projectIds = Array.from(new Set(rows.map((document) => document.project_id).filter(Boolean)));
  const creditIds = Array.from(new Set(rows.map((document) => document.credit_id).filter(Boolean))) as string[];
  const uploadedByIds = Array.from(new Set(rows.map((document) => document.uploaded_by).filter(Boolean))) as string[];

  const [{ data: projects }, { data: credits }, { data: uploaderProfiles }, { data: memberships }] = await Promise.all([
    projectIds.length
      ? client.from("projects").select("id, name").in("id", projectIds)
      : Promise.resolve({ data: [] }),
    creditIds.length
      ? client
          .from("credits")
          .select("id, credit_code, credit_name, what_to_submit, sample_document_url")
          .in("id", creditIds)
      : Promise.resolve({ data: [] }),
    uploadedByIds.length
      ? client.from("profiles").select("user_id, full_name, email").in("user_id", uploadedByIds)
      : Promise.resolve({ data: [] }),
    currentUser?.role === "super_user"
      ? Promise.resolve({ data: [] })
      : projectIds.length
        ? client
            .from("project_members")
            .select("project_id, role")
            .eq("user_id", user.id)
            .in("project_id", projectIds)
        : Promise.resolve({ data: [] }),
  ]);

  const projectsById = new Map((projects ?? []).map((project: any) => [project.id, project]));
  const creditsById = new Map((credits ?? []).map((credit: any) => [credit.id, credit]));
  const uploadersById = new Map(
    (uploaderProfiles ?? []).map((profile: any) => [
      profile.user_id,
      profile.full_name ?? profile.email ?? "Project member",
    ]),
  );
  const roleByProjectId = new Map(
    (memberships ?? []).map((membership: any) => [membership.project_id, normalizeRole(membership.role)]),
  );

  const documentRoleView = rows.map((document) => {
    const projectRole =
      currentUser?.role === "super_user"
        ? "super_user"
        : roleByProjectId.get(document.project_id) ?? currentUser?.role ?? "consultant";
    return {
      document,
      projectRole,
      canViewLogs: projectRole === "super_user" || projectRole === "project_admin",
    };
  });

  const logDocumentIds = documentRoleView.filter((item) => item.canViewLogs).map((item) => item.document.id);
  const { data: activityLogs } = logDocumentIds.length
    ? await client
        .from("document_activity_logs")
        .select("id, document_id, project_id, action, actor_id, actor_role, summary, details, created_at")
        .in("document_id", logDocumentIds)
        .order("created_at", { ascending: false })
        .limit(400)
    : { data: [] };
  const activityRows = (activityLogs ?? []) as Array<DocumentActivityLog>;
  const activityActorIds = Array.from(new Set(activityRows.map((log) => log.actor_id).filter(Boolean))) as string[];
  const { data: activityActorProfiles } = activityActorIds.length
    ? await client.from("profiles").select("user_id, full_name, email").in("user_id", activityActorIds)
    : { data: [] };
  const activityActorsById = new Map(
    (activityActorProfiles ?? []).map((profile: any) => [
      profile.user_id,
      profile.full_name ?? profile.email ?? "Project member",
    ]),
  );
  const activityByDocumentId = new Map<string, DocumentActivityLog[]>();
  for (const row of activityRows) {
    const existing = activityByDocumentId.get(row.document_id) ?? [];
    existing.push({
      ...row,
      actor_name: row.actor_id ? activityActorsById.get(row.actor_id) ?? null : null,
      details: (row.details ?? {}) as Record<string, unknown>,
    });
    activityByDocumentId.set(row.document_id, existing);
  }

  return filterDocuments(
    documentRoleView.map(({ document, projectRole, canViewLogs }) => {
      const project = projectsById.get(document.project_id);
      const credit = document.credit_id ? creditsById.get(document.credit_id) : null;
      const workflowState = normalizeWorkflowState((document as any).workflow_state, document.status);
      const normalizedStatus = workflowToLegacyStatus(workflowState);
      const canEditStatus = canEditDocumentStatusAtAnyStage(projectRole);
      const canEditMetadata =
        canEditStatus ||
        Boolean(
          document.uploaded_by &&
            document.uploaded_by === user.id &&
            (workflowState === "DRAFT" || workflowState === "READY" || workflowState === "CLARIFICATION") &&
            canEditOwnDocumentBeforeFinalApproval(projectRole),
        );
      return {
        ...document,
        status: normalizedStatus,
        workflow_state: workflowState,
        project_name: project?.name ?? "Untitled project",
        credit_code: credit?.credit_code ?? null,
        credit_name: credit?.credit_name ?? null,
        credit_what_to_submit: (credit as any)?.what_to_submit ?? null,
        credit_sample_document_url: (credit as any)?.sample_document_url ?? null,
        uploaded_by_name: document.uploaded_by ? uploadersById.get(document.uploaded_by) ?? null : null,
        project_role: projectRole,
        can_edit_metadata: canEditMetadata,
        can_edit_status: canEditStatus,
        can_reject: canEditStatus || projectRole === "owner",
        can_delete:
          projectRole === "super_user" ||
          projectRole === "super_admin" ||
          projectRole === "project_admin",
        can_view_logs: canViewLogs,
        activity_logs: canViewLogs ? activityByDocumentId.get(document.id) ?? [] : [],
      } satisfies DocumentLibraryRecord;
    }),
    filters,
  );
}

export async function getDocumentUploadOptions() {
  const projects = await getDashboardProjects();
  const uploadableProjects = projects.filter(p => canUploadProjectDocuments(p.role as MemberRole));
  if (!uploadableProjects.length) {
    return [];
  }

  const client = createClient();
  const user = await getCurrentUser();
  const projectIds = uploadableProjects.map((project) => project.id);
  const [{ data: projectCredits }, { data: historicalDocs }] = await Promise.all([
    client
      .from("project_credits")
      .select("id, project_id, status, credit:credits(id, credit_code, credit_name, documents_required, what_to_submit)")
      .in("project_id", projectIds)
      .order("created_at"),
    user
      ? client
          .from("documents")
          .select("credit_id, doc_category, file_name, status, uploaded_by")
          .eq("uploaded_by", user.id)
          .eq("status", "approved")
          .order("uploaded_at", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [] }),
  ]);

  const priorFilesByCreditAndType = new Map<string, string[]>();
  for (const doc of historicalDocs ?? []) {
    const creditId = String((doc as any).credit_id ?? "").trim();
    const docType = String((doc as any).doc_category ?? "").trim();
    const fileName = String((doc as any).file_name ?? "").trim();
    if (!creditId || !docType || !fileName) {
      continue;
    }
    const key = `${creditId}::${docType}`;
    const existing = priorFilesByCreditAndType.get(key) ?? [];
    if (!existing.includes(fileName)) {
      existing.push(fileName);
    }
    priorFilesByCreditAndType.set(key, existing.slice(0, 3));
  }

  const creditsByProject = new Map<string, {
    id: string;
    project_credit_id: string;
    status: string;
    credit_code: string;
    credit_name: string;
    doc_types: string[];
    what_to_submit: string;
    requirements: Array<{ type: string; label: string; required: boolean }>;
    prior_examples_by_type: Record<string, string[]>;
  }[]>();

  for (const row of projectCredits ?? []) {
    const credit = Array.isArray((row as any).credit) ? (row as any).credit[0] : (row as any).credit;
    if (!credit) continue;
    const existing = creditsByProject.get((row as any).project_id) ?? [];
    existing.push({
      id: credit.id,
      project_credit_id: (row as any).id,
      status: String((row as any).status ?? "NOT_STARTED"),
      credit_code: credit.credit_code,
      credit_name: credit.credit_name,
      what_to_submit: String((credit as any).what_to_submit ?? "").trim(),
      requirements: ((credit.documents_required ?? []) as DocumentRequirement[])
        .filter((doc) => doc.type)
        .map((doc) => ({
          type: doc.type,
          label: doc.label || doc.type,
          required: Boolean(doc.required),
        })),
      doc_types: Array.from(
        new Set(
          ((credit.documents_required ?? []) as DocumentRequirement[])
            .filter((doc) => doc.type)
            .map((doc) => doc.type),
        ),
      ),
      prior_examples_by_type: Array.from(
        new Set(
          ((credit.documents_required ?? []) as DocumentRequirement[])
            .filter((doc) => doc.type)
            .map((doc) => doc.type),
        ),
      ).reduce<Record<string, string[]>>((acc, docType) => {
        acc[docType] = priorFilesByCreditAndType.get(`${credit.id}::${docType}`) ?? [];
        return acc;
      }, {}),
    });
    creditsByProject.set((row as any).project_id, existing);
  }

  return uploadableProjects.map((project) => ({
    id: project.id,
    name: project.name,
    credits: creditsByProject.get(project.id) ?? [],
  }));
}

function filterDocuments(documents: DocumentLibraryRecord[], filters: { project?: string; status?: string; search?: string }) {
  const search = filters.search?.trim().toLowerCase();
  return documents.filter((document) => {
    const projectOk = filters.project ? document.project_id === filters.project : true;
    const statusOk = filters.status
      ? document.status === filters.status || String((document as any).workflow_state ?? "").toLowerCase() === filters.status.toLowerCase()
      : true;
    const searchOk = search
      ? [
          document.file_name,
          document.project_name,
          document.credit_code,
          document.credit_name,
          document.doc_category,
          document.notes,
          document.uploaded_by_name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      : true;
    return projectOk && statusOk && searchOk;
  });
}

export async function getTeamMembers() {
  if (!env.isConfigured) {
    return [];
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return [];
  }

  const currentUser = await getCurrentUser();
  if (currentUser?.role === "super_user" && env.supabaseServiceRoleKey) {
    const admin = createAdminClient();
    const { data: memberships } = await admin
      .from("project_members")
      .select("id, project_id, user_id, role, created_at, projects(name)")
      .order("created_at", { ascending: false });

    const rows = memberships ?? [];
    const userIds = Array.from(new Set(rows.map((row: any) => row.user_id).filter(Boolean)));
    const { data: profiles } = userIds.length
      ? await admin.from("profiles").select("user_id, email, full_name, company, global_role, disabled_at, disabled_reason").in("user_id", userIds)
      : { data: [] };
    const profilesByUser = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile]));
    const { data: wallets } = await admin
      .from("client_token_wallets")
      .select("client_user_id, token_balance");
    const walletByClient = new Map((wallets ?? []).map((wallet: any) => [wallet.client_user_id, Number(wallet.token_balance ?? 0)]));
    const grouped = new Map<string, TeamMemberRecord>();

    rows.forEach((row: any) => {
      const profile = profilesByUser.get(row.user_id);
      const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
      const existing = grouped.get(row.user_id);
      if (existing) {
        if (project?.name && !existing.project_names.includes(project.name)) {
          existing.project_names.push(project.name);
        }
        if (row.project_id && !existing.project_ids?.includes(row.project_id)) {
          existing.project_ids = [...(existing.project_ids ?? []), row.project_id];
        }
        return;
      }

      grouped.set(row.user_id, {
        id: row.id,
        user_id: row.user_id,
        email: profile?.email ?? row.user_id,
        full_name: profile?.full_name ?? "Project member",
        company: profile?.company ?? null,
        role: normalizeRole(profile?.global_role ?? row.role),
        project_names: project?.name ? [project.name] : [],
        project_ids: row.project_id ? [row.project_id] : [],
        created_at: row.created_at,
        token_balance:
          normalizeRole(profile?.global_role ?? row.role) === "client"
            ? walletByClient.get(row.user_id) ?? 0
            : undefined,
        disabled_at: profile?.disabled_at ?? null,
        disabled_reason: profile?.disabled_reason ?? null,
      });
    });

    return Array.from(grouped.values());
  }

  const { data: memberships } = await client
    .from("project_members")
    .select("id, project_id, user_id, role, created_at, projects(name)")
    .order("created_at", { ascending: false });

  const rows = memberships ?? [];
  const userIds = Array.from(new Set(rows.map((row: any) => row.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await client.from("profiles").select("user_id, email, full_name, company, global_role, disabled_at, disabled_reason").in("user_id", userIds)
    : { data: [] };
  const profilesByUser = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile]));
  const { data: wallets } = await client
    .from("client_token_wallets")
    .select("client_user_id, token_balance");
  const walletByClient = new Map((wallets ?? []).map((wallet: any) => [wallet.client_user_id, Number(wallet.token_balance ?? 0)]));
  const grouped = new Map<string, TeamMemberRecord>();

  rows.forEach((row: any) => {
    const profile = profilesByUser.get(row.user_id);
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    const existing = grouped.get(row.user_id);
    if (existing) {
      if (project?.name) {
        existing.project_names.push(project.name);
      }
      if (row.project_id && !existing.project_ids?.includes(row.project_id)) {
        existing.project_ids = [...(existing.project_ids ?? []), row.project_id];
      }
      return;
    }

    grouped.set(row.user_id, {
      id: row.id,
      user_id: row.user_id,
      email: profile?.email ?? row.user_id,
      full_name: profile?.full_name ?? "Project member",
      company: profile?.company ?? null,
      role: normalizeRole(profile?.global_role ?? row.role),
      project_names: project?.name ? [project.name] : [],
      project_ids: row.project_id ? [row.project_id] : [],
      created_at: row.created_at,
      token_balance:
        normalizeRole(profile?.global_role ?? row.role) === "client"
          ? walletByClient.get(row.user_id) ?? 0
          : undefined,
      disabled_at: profile?.disabled_at ?? null,
      disabled_reason: profile?.disabled_reason ?? null,
    });
  });

  return Array.from(grouped.values());
}

export async function getOwnerReviewQueue() {
  if (!env.isConfigured) {
    return [];
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return [];
  }

  const currentUser = await getCurrentUser();
  const userRole = currentUser?.role ?? "consultant";
  const reviewWorkflowStates =
    userRole === "owner"
      ? ["SUBMITTED"]
      : ["UNDER_REVIEW"];
  const projectRoleRows =
    userRole === "super_user"
      ? []
      : (await client
          .from("project_members")
          .select("project_id, role")
          .eq("user_id", user.id)).data ?? [];
  const ownedProjectIds =
    userRole === "super_user"
      ? (await client.from("projects").select("id")).data?.map((row: any) => row.id) ?? []
      : projectRoleRows
          .filter((row: any) => normalizeRole(row.role) === "owner" || normalizeRole(row.role) === "project_admin" || normalizeRole(row.role) === "super_admin")
          .map((row: any) => row.project_id);
  if (!ownedProjectIds.length) {
    return [];
  }

  const { data: docs } = await client
    .from("documents")
    .select("id, project_id, credit_id, uploaded_by, file_name, uploaded_at, notes, status, workflow_state")
    .in("project_id", ownedProjectIds)
    .in("workflow_state", reviewWorkflowStates)
    .order("uploaded_at", { ascending: true });
  const rows = docs ?? [];
  if (!rows.length) {
    return [];
  }

  const projectIds = Array.from(new Set(rows.map((row: any) => row.project_id)));
  const creditIds = Array.from(new Set(rows.map((row: any) => row.credit_id).filter(Boolean)));
  const userIds = Array.from(new Set(rows.map((row: any) => row.uploaded_by).filter(Boolean)));

  const [{ data: projects }, { data: credits }, { data: profiles }] = await Promise.all([
    client.from("projects").select("id, name").in("id", projectIds),
    creditIds.length ? client.from("credits").select("id, credit_name").in("id", creditIds) : Promise.resolve({ data: [] }),
    userIds.length ? client.from("profiles").select("user_id, full_name, email").in("user_id", userIds) : Promise.resolve({ data: [] }),
  ]);

  const projectById = new Map((projects ?? []).map((row: any) => [row.id, row.name]));
  const creditById = new Map((credits ?? []).map((row: any) => [row.id, row.credit_name]));
  const userById = new Map((profiles ?? []).map((row: any) => [row.user_id, row.full_name ?? row.email ?? "Team member"]));

  return rows.map((row: any) => ({
    id: row.id,
    project_id: row.project_id,
    project_name: projectById.get(row.project_id) ?? "Project",
    credit_name: row.credit_id ? creditById.get(row.credit_id) ?? "Credit" : "Credit",
    uploaded_by_name: row.uploaded_by ? userById.get(row.uploaded_by) ?? "Team member" : "Team member",
    file_name: row.file_name,
    uploaded_at: row.uploaded_at,
    notes: row.notes ?? "",
  }));
}

export async function getReviewerPerformanceSummary() {
  if (!env.isConfigured) {
    return {
      reviewedToday: 0,
      approvedToday: 0,
      rejectedToday: 0,
      approvalRateToday: 0,
    };
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return {
      reviewedToday: 0,
      approvedToday: 0,
      rejectedToday: 0,
      approvalRateToday: 0,
    };
  }

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const { data: logs } = await client
    .from("document_activity_logs")
    .select("details")
    .eq("actor_id", user.id)
    .eq("action", "status_updated")
    .gte("created_at", dayStart);

  let approvedToday = 0;
  let rejectedToday = 0;
  for (const row of logs ?? []) {
    const details = (row as any).details ?? {};
    const toState = String(details.to_state ?? "");
    if (toState === "APPROVED" || toState === "UNDER_REVIEW") {
      approvedToday += 1;
    }
    if (toState === "REJECTED" || toState === "CLARIFICATION") {
      rejectedToday += 1;
    }
  }
  const reviewedToday = approvedToday + rejectedToday;
  const approvalRateToday = reviewedToday ? Math.round((approvedToday / reviewedToday) * 100) : 0;

  return {
    reviewedToday,
    approvedToday,
    rejectedToday,
    approvalRateToday,
  };
}

export async function getExecutiveInsights() {
  const projects = await getDashboardProjects();
  if (!projects.length) {
    return {
      stuckItems: [] as Array<{
        projectId: string;
        projectName: string;
        creditId: string;
        creditCode: string;
        creditName: string;
        responsibleRole: string;
        missingDoc: string;
        rejectedCount: number;
      }>,
      rejectionPatterns: [] as Array<{ key: string; count: number }>,
      vendorStats: [] as Array<{
        uploader: string;
        projectCount: number;
        approved: number;
        rejected: number;
        approvalRate: number;
      }>,
      projectComparisons: [] as Array<{
        projectId: string;
        projectName: string;
        completion: number;
        pending: number;
        rejected: number;
        efficiency: number;
      }>,
    };
  }

  const client = createClient();
  const projectIds = projects.map((project) => project.id);
  const [{ data: credits }, { data: documents }, { data: profiles }] = await Promise.all([
    client
      .from("credits")
      .select("id, project_id, credit_code, credit_name, responsible_role, documents_required")
      .in("project_id", projectIds),
    client
      .from("documents")
      .select("id, project_id, credit_id, uploaded_by, status, workflow_state, rejection_reason")
      .in("project_id", projectIds),
    client.from("profiles").select("user_id, full_name, email"),
  ]);

  const docsByCredit = new Map<string, any[]>();
  for (const document of documents ?? []) {
    const existing = docsByCredit.get(document.credit_id) ?? [];
    existing.push(document);
    docsByCredit.set(document.credit_id, existing);
  }

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const uploaderById = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile.full_name ?? profile.email ?? "Team member"]));

  const stuckItems = (credits ?? [])
    .map((credit: any) => {
      const creditDocuments = docsByCredit.get(credit.id) ?? [];
      const requiredDocs = ((credit.documents_required ?? []) as Array<any>).filter((item) => Boolean(item?.required));
      const missing = requiredDocs.find((item) => !creditDocuments.some((doc) => doc.doc_category === item.type));
      const rejectedCount = creditDocuments.filter((doc) => {
        const state = normalizeWorkflowState(doc.workflow_state, doc.status);
        return state === "REJECTED" || state === "CLARIFICATION";
      }).length;
      const pendingCount = creditDocuments.filter((doc) => {
        const state = normalizeWorkflowState(doc.workflow_state, doc.status);
        return state === "SUBMITTED" || state === "UNDER_REVIEW" || state === "RESUBMITTED";
      }).length;
      return {
        projectId: credit.project_id,
        projectName: projectById.get(credit.project_id)?.name ?? "Project",
        creditId: credit.id,
        creditCode: credit.credit_code,
        creditName: credit.credit_name,
        responsibleRole: credit.responsible_role ?? "consultant",
        missingDoc: missing?.label ?? "No mandatory evidence uploaded",
        rejectedCount,
        pendingCount,
      };
    })
    .filter((item) => item.missingDoc || item.rejectedCount > 0 || item.pendingCount > 0)
    .sort((a, b) => b.rejectedCount + b.pendingCount - (a.rejectedCount + a.pendingCount))
    .slice(0, 15);

  const rejectionPatternsMap = new Map<string, number>();
  for (const document of documents ?? []) {
    const state = normalizeWorkflowState(document.workflow_state, document.status);
    if (!(state === "REJECTED" || state === "CLARIFICATION")) continue;
    const reason = String(document.rejection_reason ?? "Unspecified").trim();
    const bucket = reason ? reason.split(".")[0].slice(0, 90) : "Unspecified";
    rejectionPatternsMap.set(bucket, (rejectionPatternsMap.get(bucket) ?? 0) + 1);
  }
  const rejectionPatterns = Array.from(rejectionPatternsMap.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const uploaderAgg = new Map<
    string,
    { name: string; projects: Set<string>; approved: number; rejected: number }
  >();
  for (const document of documents ?? []) {
    if (!document.uploaded_by) continue;
    const existing = uploaderAgg.get(document.uploaded_by) ?? {
      name: uploaderById.get(document.uploaded_by) ?? "Team member",
      projects: new Set<string>(),
      approved: 0,
      rejected: 0,
    };
    existing.projects.add(document.project_id);
    const state = normalizeWorkflowState(document.workflow_state, document.status);
    if (state === "APPROVED") existing.approved += 1;
    if (state === "REJECTED" || state === "CLARIFICATION") existing.rejected += 1;
    uploaderAgg.set(document.uploaded_by, existing);
  }
  const vendorStats = Array.from(uploaderAgg.values())
    .map((entry) => {
      const totalReviewed = entry.approved + entry.rejected;
      return {
        uploader: entry.name,
        projectCount: entry.projects.size,
        approved: entry.approved,
        rejected: entry.rejected,
        approvalRate: totalReviewed ? Math.round((entry.approved / totalReviewed) * 100) : 0,
      };
    })
    .sort((a, b) => b.rejected - a.rejected)
    .slice(0, 10);

  const projectComparisons = projects.map((project) => {
    const pending = Number(project.pendingReviewsCount ?? 0);
    const rejected = Number(project.rejectedCount ?? 0);
    const reviewedBase = Math.max(pending + rejected, 1);
    const efficiency = Math.max(0, Math.round(((reviewedBase - rejected) / reviewedBase) * 100));
    return {
      projectId: project.id,
      projectName: project.name,
      completion: Math.round(project.overallCompletion),
      pending,
      rejected,
      efficiency,
    };
  });

  return {
    stuckItems,
    rejectionPatterns,
    vendorStats,
    projectComparisons,
  };
}

export async function getAuditTimeline(filters: {
  projectId?: string;
  action?: string;
  entityType?: string;
  actorRole?: string;
  limit?: number;
} = {}): Promise<AuditTimelineRecord[]> {
  if (!env.isConfigured) {
    return [];
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    return [];
  }

  const projects = await getDashboardProjects();
  const visibleProjectIds = projects.map((project) => project.id);
  if (!visibleProjectIds.length) {
    return [];
  }

  let query = client
    .from("system_activity_logs")
    .select("id, project_id, entity_type, action, actor_id, actor_role, summary, created_at")
    .in("project_id", visibleProjectIds)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(filters.limit ?? 60, 10), 200));

  if (filters.projectId) {
    query = query.eq("project_id", filters.projectId);
  }
  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters.actorRole) {
    query = query.eq("actor_role", filters.actorRole);
  }

  const { data: logs } = await query;
  const rows = logs ?? [];
  if (!rows.length) {
    return [];
  }

  const actorIds = Array.from(new Set(rows.map((row: any) => row.actor_id).filter(Boolean)));
  const [profilesResult] = await Promise.all([
    actorIds.length
      ? client.from("profiles").select("user_id, full_name, email").in("user_id", actorIds)
      : Promise.resolve({ data: [] }),
  ]);
  const actorById = new Map(
    (profilesResult.data ?? []).map((profile: any) => [
      profile.user_id,
      profile.full_name ?? profile.email ?? "Team member",
    ]),
  );
  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));

  return rows.map((row: any) => ({
    id: row.id,
    project_id: row.project_id ?? null,
    project_name: row.project_id ? projectNameById.get(row.project_id) ?? "Project" : "Project",
    entity_type: row.entity_type,
    action: row.action,
    summary: row.summary,
    actor_id: row.actor_id ?? null,
    actor_role: row.actor_role ?? null,
    actor_name: row.actor_id ? actorById.get(row.actor_id) ?? null : null,
    created_at: row.created_at,
  }));
}

export async function getMyRoleTasks() {
  if (!env.isConfigured) {
    return { role: "consultant" as MemberRole, summary: { total: 0, complete: 0, pending: 0 }, tasks: [] as Array<any> };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { role: "consultant" as MemberRole, summary: { total: 0, complete: 0, pending: 0 }, tasks: [] as Array<any> };
  }

  const scopedRoles: MemberRole[] = ["architect", "mep", "contractor"];
  if (!scopedRoles.includes(currentUser.role)) {
    return { role: currentUser.role, summary: { total: 0, complete: 0, pending: 0 }, tasks: [] as Array<any> };
  }

  const projects = await getDashboardProjects();
  const projectIds = projects.map((project) => project.id);
  if (!projectIds.length) {
    return { role: currentUser.role, summary: { total: 0, complete: 0, pending: 0 }, tasks: [] as Array<any> };
  }

  const client = createClient();
  const [{ data: credits }, { data: documents }, { data: projectRows }] = await Promise.all([
    client
      .from("credits")
      .select("id, project_id, credit_code, credit_name, responsible_role, documents_required")
      .in("project_id", projectIds)
      .eq("responsible_role", currentUser.role),
    client
      .from("documents")
      .select("id, credit_id, workflow_state, status, uploaded_at")
      .in("project_id", projectIds),
    client.from("projects").select("id, name").in("id", projectIds),
  ]);

  const projectById = new Map((projectRows ?? []).map((project: any) => [project.id, project.name]));
  const docsByCredit = new Map<string, Array<any>>();
  for (const document of documents ?? []) {
    const existing = docsByCredit.get(document.credit_id) ?? [];
    existing.push(document);
    docsByCredit.set(document.credit_id, existing);
  }

  const tasks = (credits ?? []).map((credit: any) => {
    const creditDocs = docsByCredit.get(credit.id) ?? [];
    const derived = deriveCreditLifecycleState(credit, creditDocs);
    const requiredDocCount = ((credit.documents_required ?? []) as DocumentRequirement[]).filter((doc) => doc.required).length;
    const approvedCount = creditDocs.filter((document: any) => normalizeWorkflowState(document.workflow_state, document.status) === "APPROVED").length;
    return {
      id: credit.id,
      project_id: credit.project_id,
      project_name: projectById.get(credit.project_id) ?? "Project",
      credit_name: credit.credit_name,
      status: derived.status,
      completion_pct: derived.completion_pct,
      required_count: requiredDocCount,
      approved_count: approvedCount,
    };
  });

  const complete = tasks.filter((task) => task.status === "complete").length;
  return {
    role: currentUser.role,
    summary: {
      total: tasks.length,
      complete,
      pending: Math.max(tasks.length - complete, 0),
    },
    tasks,
  };
}

export async function getSuperUserCommandCenter() {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "super_user") {
    return null;
  }
  if (!env.isConfigured || !env.supabaseServiceRoleKey) {
    return null;
  }

  const admin = createAdminClient();
  const [{ data: projects }, { data: wallets }, { data: transactions }, { data: uploadLogs }, { data: profiles }] = await Promise.all([
    admin.from("projects").select("id, name, client, status, created_at"),
    admin.from("client_token_wallets").select("client_user_id, token_balance"),
    admin
      .from("client_token_transactions")
      .select("id, client_user_id, project_id, tokens, reason, created_at, meta")
      .order("created_at", { ascending: false })
      .limit(1000),
    admin
      .from("document_activity_logs")
      .select("id, action, created_at")
      .eq("action", "uploaded")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    admin.from("profiles").select("user_id, full_name, email, company, global_role"),
  ]);

  const profileById = new Map((profiles ?? []).map((row: any) => [row.user_id, row]));
  const projectsByClient = new Map<string, Array<any>>();
  for (const project of projects ?? []) {
    const key = (project.client || "Unassigned Client").trim();
    const existing = projectsByClient.get(key) ?? [];
    existing.push(project);
    projectsByClient.set(key, existing);
  }

  const transactionsByClient = new Map<string, Array<any>>();
  for (const tx of transactions ?? []) {
    const profile = profileById.get(tx.client_user_id);
    const clientKey = (profile?.company || "Unassigned Client").trim();
    const existing = transactionsByClient.get(clientKey) ?? [];
    existing.push(tx);
    transactionsByClient.set(clientKey, existing);
  }

  const clientWalletRows = (wallets ?? []).map((wallet: any) => {
    const profile = profileById.get(wallet.client_user_id);
    return {
      client_user_id: wallet.client_user_id,
      client_name: profile?.company || "Unassigned Client",
      client_contact: profile?.full_name || profile?.email || "Client contact",
      balance: Number(wallet.token_balance ?? 0),
    };
  });

  const clientRows = Array.from(projectsByClient.entries()).map(([clientName, rows]) => {
    const matchingWallet = clientWalletRows.find((wallet) => wallet.client_name === clientName);
    const clientTx = transactionsByClient.get(clientName) ?? [];
    const consumed = clientTx
      .filter((tx) => Number(tx.tokens) < 0)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.tokens ?? 0)), 0);
    const credited = clientTx
      .filter((tx) => Number(tx.tokens) > 0)
      .reduce((sum, tx) => sum + Number(tx.tokens ?? 0), 0);
    const walletBalance = matchingWallet?.balance ?? 0;
    const projectCount = rows.length;
    const status = walletBalance <= 20 ? "Needs Top-Up" : rows.some((project: any) => project.status === "active") ? "Active" : "Monitoring";
    return {
      client_name: clientName,
      wallet_balance: walletBalance,
      project_count: projectCount,
      status,
      tokens_credited: credited,
      tokens_consumed: consumed,
    };
  });

  const totalTokensSold = (transactions ?? [])
    .filter((tx: any) => Number(tx.tokens ?? 0) > 0)
    .reduce((sum: number, tx: any) => sum + Number(tx.tokens ?? 0), 0);
  const totalTokensConsumed = (transactions ?? [])
    .filter((tx: any) => Number(tx.tokens ?? 0) < 0)
    .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.tokens ?? 0)), 0);
  const weeklyConsumed = (transactions ?? [])
    .filter((tx: any) => Number(tx.tokens ?? 0) < 0 && new Date(tx.created_at).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000)
    .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.tokens ?? 0)), 0);
  const uploadSpend = (transactions ?? [])
    .filter((tx: any) => String(tx.reason ?? "").toLowerCase().includes("upload") && Number(tx.tokens ?? 0) < 0)
    .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.tokens ?? 0)), 0);
  const consultSpend = (transactions ?? [])
    .filter((tx: any) => String(tx.reason ?? "").toLowerCase().includes("consult") && Number(tx.tokens ?? 0) < 0)
    .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.tokens ?? 0)), 0);
  const refunds = (transactions ?? [])
    .filter((tx: any) => String(tx.reason ?? "").toLowerCase().includes("refund") && Number(tx.tokens ?? 0) > 0)
    .reduce((sum: number, tx: any) => sum + Number(tx.tokens ?? 0), 0);

  const uploadsToday = (uploadLogs ?? []).length;
  const failedTransactions = (transactions ?? []).filter((tx: any) => String(tx.reason ?? "").toLowerCase().includes("failed")).length;
  const pendingReviews = (await admin.from("documents").select("*", { count: "exact", head: true }).in("workflow_state", ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"])).count ?? 0;
  const activeUsers = (await admin.from("project_members").select("user_id")).data?.map((row: any) => row.user_id).filter(Boolean);
  const uniqueActiveUsers = Array.from(new Set(activeUsers ?? [])).length;

  const criticalAlerts: string[] = [];
  for (const row of clientRows) {
    if (row.wallet_balance <= 20) {
      criticalAlerts.push(`${row.client_name} token balance critical (${row.wallet_balance} remaining)`);
    }
  }
  if (failedTransactions > 0) {
    criticalAlerts.push(`Transaction anomalies detected (${failedTransactions} flagged records)`);
  }
  if (pendingReviews > 120) {
    criticalAlerts.push(`Validation queue spike detected (${pendingReviews} pending reviews)`);
  }

  const revenueEstimateInr = totalTokensSold * 1;
  const reconciliationRows = clientWalletRows.map((wallet) => {
    const tx = (transactions ?? []).filter((row: any) => row.client_user_id === wallet.client_user_id);
    const ledgerDelta = tx.reduce((sum: number, row: any) => sum + Number(row.tokens ?? 0), 0);
    const baselineEstimate = wallet.balance - ledgerDelta;
    const mismatch = Math.abs((baselineEstimate + ledgerDelta) - wallet.balance);
    return {
      client_user_id: wallet.client_user_id,
      client_name: wallet.client_name,
      wallet_balance: wallet.balance,
      ledger_delta: ledgerDelta,
      baseline_estimate: baselineEstimate,
      mismatch,
      status: mismatch > 0 ? "investigate" : "ok",
    };
  });
  const anomalyCount = reconciliationRows.filter((row) => row.status === "investigate").length;
  if (anomalyCount > 0) {
    criticalAlerts.push(`Ledger reconciliation needs review for ${anomalyCount} client wallet(s).`);
  }

  return {
    clients: clientRows.sort((a, b) => a.client_name.localeCompare(b.client_name)),
    wallets: clientWalletRows.sort((a, b) => a.client_name.localeCompare(b.client_name)),
    tokenEconomy: {
      totalTokensSold,
      totalTokensConsumed,
      weeklyConsumed,
      uploadSpend,
      consultSpend,
      refunds,
      revenueEstimateInr,
    },
    health: {
      uploadsToday,
      failedTransactions,
      pendingReviews,
      activeUsers: uniqueActiveUsers,
    },
    alerts: criticalAlerts,
    recentTransactions: (transactions ?? []).slice(0, 20).map((tx: any) => ({
      id: tx.id,
      client_user_id: tx.client_user_id,
      project_id: tx.project_id,
      tokens: Number(tx.tokens ?? 0),
      reason: String(tx.reason ?? ""),
      created_at: tx.created_at,
    })),
    reconciliation: reconciliationRows,
  };
}
