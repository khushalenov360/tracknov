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
} from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  CreditWorkspace,
  CurrentUser,
  DocumentLibraryRecord,
  DocumentRecord,
  DocumentRequirement,
  MemberRole,
  ProjectInviteRecord,
  ProjectMemberRecord,
  ProjectStatus,
  ProjectSummary,
  ProjectType,
  ProjectWorkspace,
  RemarkRecord,
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
  const supported = ["super_user", "owner", "client", "consultant", "architect", "mep", "contractor", "project_admin", "super_admin"];
  return supported.includes(role) ? (role as MemberRole) : "consultant";
}

function normalizeProjectStatus(status?: string | null): ProjectStatus {
  return status === "on_hold" || status === "completed" || status === "archived" ? status : "active";
}

function normalizeProjectType(type?: string | null): ProjectType {
  const supported = ["residential", "commercial", "industrial", "infrastructure", "mixed_use"];
  return supported.includes(type ?? "") ? (type as ProjectType) : "commercial";
}

function mapCredit(
  credit: Record<string, any>,
  documents: Record<string, any>[],
  remarks: Record<string, any>[],
): CreditWorkspace {
  return {
    id: credit.id,
    project_id: credit.project_id,
    credit_code: credit.credit_code,
    category: credit.category,
    credit_name: credit.credit_name,
    is_mandatory: credit.is_mandatory,
    documents_required: (credit.documents_required ?? []) as DocumentRequirement[],
    status: credit.status,
    blocked_by: credit.blocked_by,
    completion_pct: Number(credit.completion_pct ?? 0),
    documentation_summary: credit.documentation_summary,
    na: credit.na,
    documents: documents.filter((document) => document.credit_id === credit.id) as DocumentRecord[],
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
    .select("global_role")
    .eq("user_id", user.id)
    .maybeSingle();
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
    redirect("/login");
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  if (currentUser?.role === "super_user" && env.supabaseServiceRoleKey) {
    const admin = createAdminClient();
    const { data: projects } = await admin
      .from("projects")
      .select("id, name, client, location, project_type, status, green_certification, igbc_variant, certification_type, target_rating, created_at")
      .order("created_at", { ascending: false });

    const summaries = await Promise.all(
      (projects ?? []).map(async (project: any) => {
        const projectId = project.id;
        const { data: credits } = await admin
          .from("credits")
          .select("id, is_mandatory, status, completion_pct")
          .eq("project_id", projectId);
        const creditIds = (credits ?? []).map((credit: any) => credit.id);
        const [{ count: docsCount }, { count: remarksCount }, { count: membersCount }] = await Promise.all([
          admin.from("documents").select("*", { count: "exact", head: true }).eq("project_id", projectId),
          creditIds.length
            ? admin.from("remarks").select("*", { count: "exact", head: true }).in("credit_id", creditIds)
            : Promise.resolve({ count: 0 }),
          admin.from("project_members").select("*", { count: "exact", head: true }).eq("project_id", projectId),
        ]);
        const creditRows = credits ?? [];

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
          overallCompletion:
            creditRows.reduce((sum: number, credit: any) => sum + Number(credit.completion_pct ?? 0), 0) /
            Math.max(creditRows.length, 1),
          totalCredits: creditRows.length,
          uploadedDocs: docsCount ?? 0,
          mandatoryCreditsMet: creditRows.filter(
            (credit: any) => credit.is_mandatory && credit.status === "complete",
          ).length,
          openRemarks: remarksCount ?? 0,
          membersCount: membersCount ?? 0,
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

  const summaries = await Promise.all(
    projects.map(async (membership) => {
      const projectId = membership.project_id;
      const { data: credits } = await client
        .from("credits")
        .select("id, is_mandatory, status, completion_pct")
        .eq("project_id", projectId);
      const creditIds = (credits ?? []).map((credit) => credit.id);
      const [{ count: docsCount }, { count: remarksCount }, { count: membersCount }] = await Promise.all([
        client.from("documents").select("*", { count: "exact", head: true }).eq("project_id", projectId),
        creditIds.length
          ? client.from("remarks").select("*", { count: "exact", head: true }).in("credit_id", creditIds)
          : Promise.resolve({ count: 0 }),
        client.from("project_members").select("*", { count: "exact", head: true }).eq("project_id", projectId),
      ]);
      const creditRows = credits ?? [];
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
        overallCompletion:
          creditRows.reduce((sum, credit) => sum + Number(credit.completion_pct ?? 0), 0) /
          Math.max(creditRows.length, 1),
        totalCredits: creditRows.length,
        uploadedDocs: docsCount ?? 0,
        mandatoryCreditsMet: creditRows.filter(
          (credit) => credit.is_mandatory && credit.status === "complete",
        ).length,
        openRemarks: remarksCount ?? 0,
        membersCount: membersCount ?? 0,
      } satisfies ProjectSummary;
    }),
  );

  return summaries;
}

export async function getProjectWorkspace(projectId: string) {
  if (!env.isConfigured) {
    redirect("/login");
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  if (currentUser?.role === "super_user" && env.supabaseServiceRoleKey) {
    const admin = createAdminClient();
    const [{ data: project }, { data: credits }, { data: documents }, { data: notifications }, members, invites] =
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
          .select("id, body, created_at, read_at")
          .eq("user_id", user.id)
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
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
    } satisfies ProjectWorkspace;
  }

  const { data: membership } = await client
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    redirect("/dashboard");
  }

  const [{ data: project }, { data: credits }, { data: documents }, { data: notifications }, members, invites] =
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
        .select("id, body, created_at, read_at")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
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
    redirect("/login");
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    redirect("/login");
  }
  const currentUser = await getCurrentUser();
  if (!canCreateProjects(currentUser?.role)) {
    redirect("/dashboard");
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
    const { error: creditsError } = await elevatedClient.from("credits").insert(buildSeedCredits(project.id));
    if (creditsError) {
      throw creditsError;
    }
  }

  return project;
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
    redirect("/login");
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  const projectRole =
    currentUser?.role === "super_user"
      ? "super_user"
      : await getMembershipRoleForProject(client, user.id, projectId);

  if (!canManageProject(projectRole)) {
    redirect("/projects");
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

export async function deleteProjectForCurrentUser(projectId: string) {
  if (!env.isConfigured) {
    redirect("/login");
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  if (!canDeleteProjects(currentUser?.role)) {
    redirect("/projects");
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
    redirect("/login");
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    redirect("/login");
  }
  const currentUser = await getCurrentUser();

  let query = client.from("documents").select("*").order("uploaded_at", { ascending: false });
  if (filters.project) {
    query = query.eq("project_id", filters.project);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
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
      ? client.from("credits").select("id, credit_code, credit_name").in("id", creditIds)
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

  return filterDocuments(
    rows.map((document) => {
      const project = projectsById.get(document.project_id);
      const credit = document.credit_id ? creditsById.get(document.credit_id) : null;
      const projectRole =
        currentUser?.role === "super_user"
          ? "super_user"
          : roleByProjectId.get(document.project_id) ?? currentUser?.role ?? "consultant";
      const canEditStatus = canEditDocumentStatusAtAnyStage(projectRole);
      const canEditMetadata =
        canEditStatus ||
        Boolean(
          document.uploaded_by &&
            document.uploaded_by === user.id &&
            document.status !== "approved" &&
            canEditOwnDocumentBeforeFinalApproval(projectRole),
        );
      return {
        ...document,
        project_name: project?.name ?? "Untitled project",
        credit_code: credit?.credit_code ?? null,
        credit_name: credit?.credit_name ?? null,
        uploaded_by_name: document.uploaded_by ? uploadersById.get(document.uploaded_by) ?? null : null,
        project_role: projectRole,
        can_edit_metadata: canEditMetadata,
        can_edit_status: canEditStatus,
        can_reject: canEditStatus || projectRole === "owner",
        can_delete:
          projectRole === "super_user" ||
          projectRole === "super_admin" ||
          projectRole === "project_admin",
      } satisfies DocumentLibraryRecord;
    }),
    filters,
  );
}

export async function getDocumentUploadOptions() {
  const projects = await getDashboardProjects();
  if (!projects.length) {
    return [];
  }

  const client = createClient();
  const projectIds = projects.map((project) => project.id);
  const { data: credits } = await client
    .from("credits")
    .select("id, project_id, credit_code, credit_name, documents_required")
    .in("project_id", projectIds)
    .order("credit_code");

  const creditsByProject = new Map<string, {
    id: string;
    credit_code: string;
    credit_name: string;
    doc_types: string[];
  }[]>();

  for (const credit of credits ?? []) {
    const existing = creditsByProject.get(credit.project_id) ?? [];
    existing.push({
      id: credit.id,
      credit_code: credit.credit_code,
      credit_name: credit.credit_name,
      doc_types: Array.from(
        new Set(
          ((credit.documents_required ?? []) as DocumentRequirement[])
            .filter((doc) => doc.required)
            .map((doc) => doc.type),
        ),
      ),
    });
    creditsByProject.set(credit.project_id, existing);
  }

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    credits: creditsByProject.get(project.id) ?? [],
  }));
}

function filterDocuments(documents: DocumentLibraryRecord[], filters: { project?: string; status?: string; search?: string }) {
  const search = filters.search?.trim().toLowerCase();
  return documents.filter((document) => {
    const projectOk = filters.project ? document.project_id === filters.project : true;
    const statusOk = filters.status ? document.status === filters.status : true;
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
    redirect("/login");
  }

  const client = createClient();
  const user = await getSupabaseUser(client);
  if (!user) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  if (currentUser?.role === "super_user" && env.supabaseServiceRoleKey) {
    const admin = createAdminClient();
    const { data: memberships } = await admin
      .from("project_members")
      .select("id, user_id, role, created_at, projects(name)")
      .order("created_at", { ascending: false });

    const rows = memberships ?? [];
    const userIds = Array.from(new Set(rows.map((row: any) => row.user_id).filter(Boolean)));
    const { data: profiles } = userIds.length
      ? await admin.from("profiles").select("user_id, email, full_name, company, global_role").in("user_id", userIds)
      : { data: [] };
    const profilesByUser = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile]));
    const grouped = new Map<string, TeamMemberRecord>();

    rows.forEach((row: any) => {
      const profile = profilesByUser.get(row.user_id);
      const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
      const existing = grouped.get(row.user_id);
      if (existing) {
        if (project?.name && !existing.project_names.includes(project.name)) {
          existing.project_names.push(project.name);
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
        created_at: row.created_at,
      });
    });

    return Array.from(grouped.values());
  }

  const { data: memberships } = await client
    .from("project_members")
    .select("id, user_id, role, created_at, projects(name)")
    .order("created_at", { ascending: false });

  const rows = memberships ?? [];
  const userIds = Array.from(new Set(rows.map((row: any) => row.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await client.from("profiles").select("user_id, email, full_name, company, global_role").in("user_id", userIds)
    : { data: [] };
  const profilesByUser = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile]));
  const grouped = new Map<string, TeamMemberRecord>();

  rows.forEach((row: any) => {
    const profile = profilesByUser.get(row.user_id);
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    const existing = grouped.get(row.user_id);
    if (existing) {
      if (project?.name) {
        existing.project_names.push(project.name);
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
      created_at: row.created_at,
    });
  });

  return Array.from(grouped.values());
}
