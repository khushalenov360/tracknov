import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { certificationStrategyEngine } from "@/lib/harita-engine/services/certification-strategy-engine";
import { submissionReadinessEngine } from "@/lib/harita-engine/services/submission-readiness-engine";
import { evidenceGraphEngine } from "@/lib/harita-engine/services/evidence-graph-engine";
import { CreditAssignmentGraph, getCreditAssignmentGraph } from "../../services/credit-assignment-graph";

export interface ProjectRow {
  id: string;
  name: string;
  client?: string | null;
  location?: string | null;
  certification_type?: string | null;
  status?: string | null;
}

export interface CreditRow {
  id: string;
  project_id: string;
  credit_code: string;
  credit_name?: string;
  documents_required?: Array<{ type: string; label: string; required: boolean }>;
  what_to_submit?: string | null;
  status: string;
  state: string; // compatibility
  assigned_user_id?: string | null;
  responsible_role?: string | null;
  category?: string | null;
  category_name?: string | null;
  completion_pct?: number | null;
  is_mandatory?: boolean | null;
  blocked_by?: string | null;
  na?: boolean | null;
}

export interface DocumentRow {
  id: string;
  project_id: string;
  file_name: string;
  doc_category: string;
  state: string;
  uploaded_at: string;
}

export interface ProfileMap {
  [userId: string]: { full_name: string; email: string };
}

export interface RuntimeContext {
  project: ProjectRow | null;
  accessibleProjects: ProjectRow[];
  credits: CreditRow[];
  creditAssignmentGraph: Map<string, CreditAssignmentGraph>;
  documents: DocumentRow[];
  guidebooks: Array<{ project_id: string; title: string; file_name: string; created_at?: string }>;
  profiles: ProfileMap;
  documentIntelligence: any[];
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isSuperUser: boolean;
  };
}

export async function assembleRuntimeContext(
  focusedProjectId: string | null = null,
  reqUser: any = null
): Promise<RuntimeContext | null> {
  const client = createClient();
  
  let user = reqUser;
  if (!user) {
    const { data, error: authErr } = await client.auth.getUser();
    user = data.user;
    if (!user) {
      console.log("[assembleRuntimeContext] client.auth.getUser() returned null user! AuthError:", authErr);
      return null; // Unauthenticated
    }
  }

  console.log("[assembleRuntimeContext] Authenticated user:", user.email, user.id);

  const { data: profile } = await client
    .from("profiles")
    .select("global_role, full_name, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const userName = profile?.full_name ?? (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ?? "";
  const userEmail = profile?.email ?? user.email ?? "";
  const metadataRole = typeof user.user_metadata?.role === "string" ? user.user_metadata.role : "";
  const resolvedRole = (profile?.global_role ?? metadataRole ?? "consultant") as string;
  
  const isSuperUser = ["super_user", "super_admin", "L5", "L3", "superuser"].includes(resolvedRole) || ["super_user", "superuser"].includes(metadataRole);
  const reader = isSuperUser && env.supabaseServiceRoleKey ? createAdminClient() : client;

  let query = reader.from("projects").select("id, name, client, location, certification_type, status").order("created_at", { ascending: false });
  if (focusedProjectId && !isSuperUser) {
    // If not super user, we will just let RLS handle it, but we can scope the query if needed
    query = query.eq("id", focusedProjectId);
  }
  
  const { data: projectsData } = await query.limit(20);
  const projects = (projectsData ?? []) as ProjectRow[];
  const projectIds = projects.map(p => p.id);

  if (!projectIds.length) {
    console.log("[assembleRuntimeContext] No projectIds found!");
    return null;
  }
  
  console.log("[assembleRuntimeContext] Found projectIds:", projectIds);

  // Ensure isolation: if focusedProjectId is provided, it must be in the accessible list
  if (focusedProjectId && !projectIds.includes(focusedProjectId)) {
    throw new Error("ACCESS_DENIED_PROJECT_ISOLATION");
  }

  const targetProjectIds = focusedProjectId ? [focusedProjectId] : projectIds;

  const [creditsResult, documentsResult, guidebooksResult] = await Promise.all([
    reader
      .from("project_credits")
      .select("id, project_id, credit_code, credit_name, status, category, category_name, assigned_user_id, responsible_role, completion_pct, max_points, is_mandatory, documents_required, what_to_submit, blocked_by, na")
      .in("project_id", targetProjectIds)
      .order("credit_code"),
    reader
      .from("project_document")
      .select("id, project_id, file_name, doc_category, state, uploaded_at")
      .in("project_id", targetProjectIds)
      .order("uploaded_at", { ascending: false })
      .limit(400),
    reader
      .from("project_guidebooks")
      .select("project_id, title, file_name, created_at")
      .in("project_id", targetProjectIds)
      .order("created_at", { ascending: false })
  ]);

  const credits = ((creditsResult.data ?? []) as any[]).map(c => ({
    ...c,
    state: c.status ?? "DRAFT",
  })) as CreditRow[];

  const rawDocuments = (documentsResult.data ?? []) as DocumentRow[];
  const guidebooks = (guidebooksResult.data ?? []) as any[];

  // Filter Active Evidence (Context Isolation WS1)
  const { contextIsolationEngine } = await import("../../runtime/context-isolation-engine");
  const discardedIds = await contextIsolationEngine.getDiscardedArtifactIds(user.id, targetProjectIds[0]);
  const documents = contextIsolationEngine.filterActiveEvidence(rawDocuments as any, discardedIds) as unknown as DocumentRow[];

  const assignedUserIds = [...new Set(credits.map(c => c.assigned_user_id).filter(Boolean))] as string[];
  const profilesMap: ProfileMap = {};
  if (assignedUserIds.length > 0) {
    const { data: profilesData } = await reader.from("profiles").select("user_id, full_name, email").in("user_id", assignedUserIds);
    for (const p of profilesData ?? []) {
      profilesMap[p.user_id] = { full_name: p.full_name ?? "Unknown", email: p.email ?? "" };
    }
  }

  const { data: intelligence } = await reader
    .from("document_intelligence")
    .select("*")
    .in("document_id", documents.slice(0, 5).map(d => d.id));

  const creditAssignmentGraph = await getCreditAssignmentGraph(targetProjectIds, credits, reader);

  const runtimeCtx: RuntimeContext = {
    project: focusedProjectId ? (projects.find(p => p.id === focusedProjectId) ?? null) : null,
    accessibleProjects: projects,
    credits,
    creditAssignmentGraph,
    documents,
    guidebooks,
    profiles: profilesMap,
    documentIntelligence: intelligence ?? [],
    user: {
      id: user.id,
      email: userEmail,
      name: userName,
      role: resolvedRole,
      isSuperUser
    }
  };

  return runtimeCtx;
}

export function formatRuntimeContext(ctx: RuntimeContext): string {
  const projectLines: string[] = [];
  const guidebookLines: string[] = [];
  const documentLines: string[] = [];
  const creditLines: string[] = [];
  
  if (ctx.project) {
    projectLines.push(`Project: ${ctx.project.name}`);
    projectLines.push(`State: ${ctx.project.status ?? "unknown"} | Certification: ${ctx.project.certification_type ?? "n/a"} | Client: ${ctx.project.client ?? "n/a"} | Location: ${ctx.project.location ?? "n/a"}`);
  } else {
    projectLines.push(`Accessible projects: ${ctx.accessibleProjects.length}`);
  }

  const activeCredits = ctx.credits.filter(c => !c.na);
  const completeCredits = activeCredits.filter(c => c.status === "APPROVED" || c.status === "complete").length;
  const blockedCredits = activeCredits.filter(c => c.status === "BLOCKED").length;
  const inProgressCredits = activeCredits.filter(c => c.status === "IN_PROGRESS").length;
  const draftCredits = activeCredits.filter(c => c.status === "DRAFT").length;
  const naCredits = ctx.credits.filter(c => c.na);
  
  projectLines.push(`Credits Loaded: ${ctx.credits.length}`);
  projectLines.push(`Active: ${activeCredits.length} (In Progress: ${inProgressCredits}, Completed: ${completeCredits}, Blocked: ${blockedCredits}, Draft: ${draftCredits})`);
  projectLines.push(`Not Required / Not Applicable: ${naCredits.length} (${naCredits.map(c => c.credit_code).join(", ") || "None"})`);

  creditLines.push(`Assignments:`);
  for (const credit of ctx.credits) {
    const graph = ctx.creditAssignmentGraph.get(credit.id);
    const completion = credit.completion_pct != null ? `${credit.completion_pct}%` : "0%";
    const blocked = credit.blocked_by ? ` [BLOCKED BY: ${credit.blocked_by}]` : "";
    const naSuffix = credit.na ? " [NOT REQUIRED / NA]" : "";
    const baseStr = `${credit.credit_code} | ${credit.credit_name} | status=${credit.status} | completion=${completion}${blocked}${naSuffix}`;
    
    if (!graph || graph.requirements.length === 0) {
      const p = credit.assigned_user_id ? ctx.profiles[credit.assigned_user_id] : null;
      const owner = p ? `${p.full_name} (${p.email})` : (credit.responsible_role ?? "UNASSIGNED");
      creditLines.push(`${baseStr} -> ${owner} (Single Owner)`);
    } else {
      const contributors = new Set(graph.requirements.map(r => r.contributorId).filter(Boolean));
      if (contributors.size <= 1) {
         const singleOwner = graph.requirements.find(r => r.contributorName)?.contributorName ?? "Unassigned";
         creditLines.push(`${baseStr} -> ${singleOwner} (Single Owner)`);
      } else {
         creditLines.push(`${baseStr} -> MULTIPLE CONTRIBUTORS`);
         for (const req of graph.requirements) {
           creditLines.push(`  - ${req.requirementType}: ${req.contributorName ?? "Unassigned"}`);
         }
      }
    }
  }

  const uploadedCount = ctx.documents.filter((d) => d.state === "READY" || d.state === "uploaded").length;
  const ownerReviewCount = ctx.documents.filter((d) => d.state === "SUBMITTED").length;
  const approvedCount = ctx.documents.filter((d) => d.state === "APPROVED").length;
  
  documentLines.push(`Uploaded: ${uploadedCount} | Pending Review: ${ownerReviewCount} | Approved: ${approvedCount}`);
  
  const recentFiles = ctx.documents.slice(0, 5).map(doc => `${doc.file_name} [${doc.doc_category}/${doc.state}]`).join("; ");
  documentLines.push(`Recent files: ${recentFiles || "none"}`);

  if (ctx.documentIntelligence.length) {
    documentLines.push(`Document intelligence:`);
    for (const intel of ctx.documentIntelligence) {
      const doc = ctx.documents.find(d => d.id === intel.document_id);
      documentLines.push(`- ${doc?.file_name}: ${intel.summary} [Relevance: ${intel.relevance_score}%] Risks: ${intel.risks?.join(", ") || "None"}`);
    }
  }

  // Submission Readiness — EXCLUDE na credits
  const topPendingEvaluated = ctx.credits
    .filter((credit) => !credit.na && credit.status !== "APPROVED" && credit.status !== "complete")
    .slice(0, 3)
    .map(credit => submissionReadinessEngine.generateContextString(credit, ctx.documents))
    .join("\n");
  
  if (topPendingEvaluated) {
    creditLines.push(`Submission readiness:`);
    creditLines.push(topPendingEvaluated);
  }

  const strategy = certificationStrategyEngine.getStrategy(ctx.credits);
  creditLines.push(`Certification strategy:`);
  creditLines.push(certificationStrategyEngine.generateContextString(strategy));

  // Full credit matrix — gives Harita complete awareness of every credit
  creditLines.push(`Full credit status matrix:`);
  creditLines.push(`(All ${ctx.credits.length} credits loaded. NA=Not Required/Not Applicable for this project.)`);
  creditLines.push(`CODE | NAME | STATUS | MAX_PTS | NA | COMPLETION%`);
  for (const c of ctx.credits) {
    const maxPts = (c as any).max_points ?? 0;
    const na = c.na ? "YES" : "NO";
    const pct = c.completion_pct != null ? `${c.completion_pct}%` : "0%";
    creditLines.push(`${c.credit_code} | ${c.credit_name ?? ""} | ${c.status} | ${maxPts} | ${na} | ${pct}`);
  }

  if (ctx.guidebooks.length) {
    for (const guidebook of ctx.guidebooks.slice(0, 5)) {
      guidebookLines.push(`${guidebook.title || guidebook.file_name} | uploaded_at=${guidebook.created_at ?? "unknown"}`);
    }
  } else {
    guidebookLines.push(`No guidebook metadata found.`);
  }

  return [
    `<project_database_current_state>`,
    ...projectLines,
    `</project_database_current_state>`,
    ``,
    `<authoritative_igbc_guidebook_rules>`,
    ...guidebookLines,
    `</authoritative_igbc_guidebook_rules>`,
    ``,
    `<uploaded_document_variables>`,
    ...documentLines,
    `</uploaded_document_variables>`,
    ``,
    `<project_credit_execution_matrix>`,
    ...creditLines,
    `</project_credit_execution_matrix>`,
  ].join("\n");
}
