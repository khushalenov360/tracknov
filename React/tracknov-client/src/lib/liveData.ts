import { supabase } from "./supabaseClient";

export type CurrentUser = {
  id: string;
  email: string;
  role: string;
  name: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  client?: string | null;
  certification_type?: string | null;
  target_rating?: string | null;
  health_status?: string | null;
  assignments_locked?: boolean | null;
};

export type WorkspaceCredit = {
  id: string;
  project_id: string;
  credit_code: string;
  credit_name: string;
  available_points?: number | null;
  max_points?: number | null;
  status?: string | null;
  state?: string | null;
  responsible_role?: string | null;
  category?: string | null;
  category_name?: string | null;
  is_mandatory?: boolean | null;
  documents_required?: any[] | null;
  remarks?: any[];
  assignments?: any[];
  documents?: WorkspaceDocument[];
};

export type WorkspaceDocument = {
  id: string;
  project_id: string;
  project_credit_id?: string | null;
  file_name: string;
  doc_category?: string | null;
  workflow_state?: string | null;
  status?: string | null;
  uploaded_at?: string | null;
  notes?: string | null;
  intelligence?: {
    evidence_type?: string | null;
    suggested_credits?: any[];
    responsible_roles?: any[];
    summary?: string | null;
    relevance_score?: number | null;
    risks?: string[];
    next_steps?: string[];
  } | null;
};

export type WorkspaceMember = {
  user_id: string;
  role: string;
  full_name: string;
  email: string;
};

export type ProjectWorkspace = {
  project: ProjectSummary & {
    location?: string | null;
    status?: string | null;
  };
  user: CurrentUser;
  userRole: string;
  credits: WorkspaceCredit[];
  assignments: any[];
  notifications: any[];
  documents: WorkspaceDocument[];
  members: WorkspaceMember[];
};

export type ReviewerQueueEntry = {
  id: string;
  project_id: string;
  document_id: string;
  reviewer_role?: string | null;
  action: string;
  status_after: string;
  remarks?: string | null;
  created_at: string;
};

function normalizeRole(role?: string | null) {
  return String(role || "consultant");
}

function normalizeStatus(value?: string | null) {
  const raw = String(value || "").toUpperCase();
  if (raw.includes("APPROVED") || raw.includes("COMPLETE")) return "approved";
  if (raw.includes("BLOCK") || raw.includes("REJECT")) return "blocked";
  return "pending";
}

function creditCategory(credit: WorkspaceCredit) {
  return credit.category || credit.category_name || credit.credit_code?.split(" ")[0] || "OTHER";
}

export function getCreditStatus(credit: WorkspaceCredit) {
  return normalizeStatus(credit.state || credit.status);
}

export function getCreditPoints(credit: WorkspaceCredit) {
  return Number(credit.available_points ?? credit.max_points ?? 0);
}

export function getCreditStats(credits: WorkspaceCredit[]) {
  const categoriesMap = new Map<string, { key: string; label: string; count: number; completed: number; blocked: number }>();

  for (const credit of credits) {
    const key = creditCategory(credit);
    const current = categoriesMap.get(key) ?? { key, label: key, count: 0, completed: 0, blocked: 0 };
    current.count += 1;

    const status = getCreditStatus(credit);
    if (status === "approved") current.completed += 1;
    if (status === "blocked") current.blocked += 1;

    categoriesMap.set(key, current);
  }

  return {
    categories: Array.from(categoriesMap.values()),
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user;

  if (!authUser) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("global_role, full_name")
    .eq("user_id", authUser.id)
    .maybeSingle();

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    role: normalizeRole(profile?.global_role || authUser.user_metadata?.role),
    name:
      profile?.full_name ||
      authUser.user_metadata?.full_name ||
      authUser.email?.split("@")[0] ||
      "User",
  };
}

export async function getDashboardProjects(): Promise<ProjectSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("project_users")
    .select("role, project:projects(id, name, client, certification_type, target_rating, health_status)")
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row: any) => row.project)
    .filter(Boolean);
}

export async function getProjectWorkspace(projectId: string): Promise<ProjectWorkspace | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [{ data: membership, error: membershipError }, { data: project, error: projectError }] = await Promise.all([
    supabase
      .from("project_users")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("projects")
      .select("id, name, client, location, status, certification_type, target_rating, health_status, assignments_locked")
      .eq("id", projectId)
      .single(),
  ]);

  if (membershipError || projectError || !membership || !project) {
    return null;
  }

  const effectiveRole = ["super_user", "super_admin", "project_admin", "L3", "L5"].includes(user.role)
    ? user.role
    : normalizeRole(membership.role);

  const [{ data: credits }, { data: assignments }, { data: notifications }, { data: documents }, { data: members }] = await Promise.all([
    supabase
      .from("project_credits")
      .select("*")
      .eq("project_id", projectId)
      .order("credit_code"),
    supabase
      .from("assignments")
      .select("id, project_id, project_credit_id, document_type, user_id, role, is_active")
      .eq("project_id", projectId)
      .eq("is_active", true),
    supabase
      .from("notifications")
      .select("id, body, action_url, created_at, read_at")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_document")
      .select("id, project_id, project_credit_id, file_name, doc_category, workflow_state, status, uploaded_at, notes")
      .eq("project_id", projectId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("project_users")
      .select("user_id, role")
      .eq("project_id", projectId),
  ]);

  const creditIds = (credits ?? []).map((credit: any) => credit.id);
  const assignmentUserIds = [...new Set((assignments ?? []).map((assignment: any) => assignment.user_id).filter(Boolean))];
  const documentIds = (documents ?? []).map((document: any) => document.id);
  const memberUserIds = [...new Set((members ?? []).map((member: any) => member.user_id).filter(Boolean))];
  const profileIds = [...new Set([...assignmentUserIds, ...memberUserIds])];

  const [{ data: remarks }, { data: assignmentProfiles }, { data: documentIntelligence }] = await Promise.all([
    creditIds.length
      ? supabase.from("remarks").select("*").in("credit_id", creditIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    profileIds.length
      ? supabase.from("profiles").select("user_id, full_name, email").in("user_id", profileIds)
      : Promise.resolve({ data: [] as any[] }),
    documentIds.length
      ? supabase
          .from("document_intelligence")
          .select("document_id, summary, relevance_score, risks, next_steps, evidence_type, suggested_credits, responsible_roles")
          .in("document_id", documentIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const remarksByCredit = new Map<string, any[]>();
  for (const remark of remarks ?? []) {
    const bucket = remarksByCredit.get(remark.credit_id) ?? [];
    bucket.push(remark);
    remarksByCredit.set(remark.credit_id, bucket);
  }

  const assignmentProfilesById = new Map<string, { full_name: string; email: string }>();
  for (const profile of assignmentProfiles ?? []) {
    assignmentProfilesById.set(profile.user_id, {
      full_name: profile.full_name ?? "Assigned User",
      email: profile.email ?? "",
    });
  }

  const assignmentsByCredit = new Map<string, any[]>();
  for (const assignment of assignments ?? []) {
    const enriched = {
      ...assignment,
      full_name: assignmentProfilesById.get(assignment.user_id)?.full_name ?? null,
      email: assignmentProfilesById.get(assignment.user_id)?.email ?? null,
    };
    const bucket = assignmentsByCredit.get(assignment.project_credit_id) ?? [];
    bucket.push(enriched);
    assignmentsByCredit.set(assignment.project_credit_id, bucket);
  }

  const intelligenceByDocumentId = new Map<string, any>();
  for (const intelligence of documentIntelligence ?? []) {
    intelligenceByDocumentId.set(intelligence.document_id, intelligence);
  }

  const mappedDocuments: WorkspaceDocument[] = (documents ?? []).map((document: any) => {
    const intelligence = intelligenceByDocumentId.get(document.id);
    return {
      ...document,
      intelligence: intelligence
        ? {
            evidence_type: intelligence.evidence_type ?? null,
            suggested_credits: intelligence.suggested_credits ?? [],
            responsible_roles: intelligence.responsible_roles ?? [],
            summary: intelligence.summary ?? null,
            relevance_score: intelligence.relevance_score ?? null,
            risks: intelligence.risks ?? [],
            next_steps: intelligence.next_steps ?? [],
          }
        : null,
    };
  });

  const documentsByCredit = new Map<string, WorkspaceDocument[]>();
  for (const document of mappedDocuments) {
    const projectCreditId = document.project_credit_id;
    if (!projectCreditId) continue;
    const bucket = documentsByCredit.get(projectCreditId) ?? [];
    bucket.push(document);
    documentsByCredit.set(projectCreditId, bucket);
  }

  const mappedMembers: WorkspaceMember[] = (members ?? []).map((member: any) => ({
    user_id: member.user_id,
    role: member.role,
    full_name: assignmentProfilesById.get(member.user_id)?.full_name ?? "Assigned User",
    email: assignmentProfilesById.get(member.user_id)?.email ?? "",
  }));

  const mappedCredits: WorkspaceCredit[] = (credits ?? []).map((credit: any) => ({
    ...credit,
    remarks: remarksByCredit.get(credit.id) ?? [],
    assignments: assignmentsByCredit.get(credit.id) ?? [],
    documents: documentsByCredit.get(credit.id) ?? [],
    category: credit.category ?? credit.category_name ?? credit.credit_code?.split(" ")[0] ?? "OTHER",
  }));

  return {
    project,
    user,
    userRole: effectiveRole,
    credits: mappedCredits,
    assignments: assignments ?? [],
    notifications: notifications ?? [],
    documents: mappedDocuments,
    members: mappedMembers,
  };
}

export async function getReviewerQueue(projectId: string, userRole: string): Promise<ReviewerQueueEntry[]> {
  const reviewerRoles = ["project_admin", "super_admin", "super_user", "L3", "L5"];
  if (!reviewerRoles.includes(userRole)) {
    throw new Error("Unauthorized: reviewer dashboard is restricted to reviewer and admin roles.");
  }

  const { data, error } = await supabase
    .from("document_reviews")
    .select("id, project_id, document_id, reviewer_role, action, status_after, remarks, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []) as ReviewerQueueEntry[];
}
