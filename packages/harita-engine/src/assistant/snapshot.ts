import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { certificationStrategyEngine } from "@tracknov/harita-engine/services/certification-strategy-engine";
import { submissionReadinessEngine } from "@tracknov/harita-engine/services/submission-readiness-engine";
import { evidenceGraphEngine } from "@tracknov/harita-engine/services/evidence-graph-engine";
import { CreditAssignmentGraph, getCreditAssignmentGraph } from "../services/credit-assignment-graph";

export type ProjectRow = {
  id: string;
  name: string;
  client?: string | null;
  location?: string | null;
  certification_type?: string | null;
  status?: string | null;
};

export type CreditRow = {
  id: string;
  project_id: string;
  credit_code: string;
  credit_name?: string;
  documents_required?: Array<{ type: string; label: string; required: boolean }>;
  what_to_submit?: string | null;
  state: string;
  // Runtime fields (now fetched)
  assigned_user_id?: string | null;
  responsible_role?: string | null;
  category?: string | null;
  category_name?: string | null;
  completion_pct?: number | null;
  is_mandatory?: boolean | null;
  blocked_by?: string | null;
};

export type DocumentRow = {
  id: string;
  project_id: string;
  file_name: string;
  doc_category: string;
  state: string;
  uploaded_at: string;
};

export type ProfileMap = Map<string, { full_name: string; email: string }>;

export function buildWorkspaceSnapshot(
  projects: ProjectRow[],
  credits: CreditRow[],
  documents: DocumentRow[],
  role: string,
  guidebooks: Array<{ project_id: string; title: string; file_name: string; created_at?: string }>,
  profileMap: ProfileMap = new Map(),
  creditAssignmentGraph?: Map<string, CreditAssignmentGraph>
) {
  if (!projects.length) {
    return "No accessible projects were found for this user.";
  }

  const creditsByProject = new Map<string, CreditRow[]>();
  const docsByProject = new Map<string, DocumentRow[]>();

  for (const credit of credits) {
    const bucket = creditsByProject.get(credit.project_id) ?? [];
    bucket.push(credit);
    creditsByProject.set(credit.project_id, bucket);
  }

  for (const document of documents) {
    const bucket = docsByProject.get(document.project_id) ?? [];
    bucket.push(document);
    docsByProject.set(document.project_id, bucket);
  }

  const lines: string[] = [];
  lines.push(`Accessible projects: ${projects.length}`);

  for (const project of projects.slice(0, 12)) {
    const projectCredits = creditsByProject.get(project.id) ?? [];
    const projectDocs = docsByProject.get(project.id) ?? [];

    const completeCredits = projectCredits.filter((c) => c.state === "APPROVED" || c.state === "complete").length;
    const blockedCredits = projectCredits.filter((c) => c.state === "BLOCKED" || c.state === "blocked").length;
    const inProgressCredits = projectCredits.filter((c) => c.state === "IN_PROGRESS").length;
    const draftCredits = projectCredits.filter((c) => c.state === "DRAFT").length;

    const uploadedCount = projectDocs.filter((d) => d.state === "READY" || d.state === "uploaded").length;
    const ownerReviewCount = projectDocs.filter((d) => d.state === "SUBMITTED").length;
    const approvedCount = projectDocs.filter((d) => d.state === "APPROVED").length;
    const rejectedCount = projectDocs.filter((d) => d.state === "REJECTED" || d.state === "CLARIFICATION").length;

    let totalRequiredDocs = 0;
    for (const c of projectCredits) {
      if (Array.isArray(c.documents_required)) {
        totalRequiredDocs += c.documents_required.filter((d: any) => d.required).length;
      }
    }

    // --- Project header ---
    lines.push(`\n=== PROJECT: ${project.name} ===`);
    lines.push(`State=${project.status ?? "unknown"} | Certification=${project.certification_type ?? "n/a"} | Client=${project.client ?? "n/a"} | Location=${project.location ?? "n/a"}`);

    // --- Credit summary ---
    lines.push(`\n--- CREDIT SUMMARY (${projectCredits.length} total) ---`);
    lines.push(`Complete=${completeCredits} | In Progress=${inProgressCredits} | Draft=${draftCredits} | Blocked=${blockedCredits}`);

    // Group by category for summary
    const byCategory = new Map<string, CreditRow[]>();
    for (const c of projectCredits) {
      const cat = c.category_name ?? c.category ?? "Uncategorised";
      const bucket = byCategory.get(cat) ?? [];
      bucket.push(c);
      byCategory.set(cat, bucket);
    }
    for (const [cat, catCredits] of byCategory.entries()) {
      lines.push(`  ${cat}: ${catCredits.length} credits`);
    }

    // --- Full credit tracker (LIVE DATA) ---
    lines.push(`\n--- FULL CREDIT TRACKER ---`);
    for (const credit of projectCredits) {
      const graph = creditAssignmentGraph?.get(credit.id);
      const completion = credit.completion_pct != null ? `${credit.completion_pct}%` : "0%";
      const mandatory = credit.is_mandatory ? " [MANDATORY]" : "";
      const blocked = credit.blocked_by ? ` [BLOCKED BY: ${credit.blocked_by}]` : "";
      
      lines.push(`${credit.credit_code}${mandatory} | ${credit.credit_name ?? ""} | status=${credit.state} | completion=${completion}${blocked}`);
      
      if (!graph || graph.requirements.length === 0) {
        const assignedProfile = credit.assigned_user_id ? profileMap.get(credit.assigned_user_id) : null;
        const assignedTo = assignedProfile
          ? `${assignedProfile.full_name} (${assignedProfile.email})`
          : credit.responsible_role ?? "UNASSIGNED";
        lines.push(`  Assigned to: ${assignedTo} (Single Owner)`);
      } else {
        const assignedContributors = new Set(graph.requirements.filter(r => r.contributorId).map(r => r.contributorId));
        if (assignedContributors.size <= 1) {
          const singleContributor = graph.requirements.find(r => r.contributorName)?.contributorName ?? "Unassigned";
          lines.push(`  Assigned to: ${singleContributor} (Single Owner)`);
        } else {
          lines.push(`  ${credit.credit_code} currently has multiple contributors.`);
          for (const req of graph.requirements) {
            lines.push(`    ${req.requirementType}`);
            lines.push(`    • ${req.contributorName ?? "Unassigned"}`);
            lines.push(``); // Blank line for formatting
          }
          lines.push(`    This credit does not currently have a single owner.`);
        }
      }
    }

    // --- Document state ---
    lines.push(`\n--- DOCUMENTS ---`);
    lines.push(`Uploaded=${uploadedCount} | Required=${totalRequiredDocs} | Pending Review=${ownerReviewCount} | Approved=${approvedCount} | Rejected=${rejectedCount}`);

    const recentFiles = projectDocs
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .slice(0, 8)
      .map((doc) =>
        role === "client" ? `${doc.doc_category}/${doc.state}` : `${doc.file_name} [${doc.doc_category}/${doc.state}]`,
      )
      .join("; ");
    lines.push(`Recent files: ${recentFiles || "none"}`);

    // --- Submission readiness for top pending ---
    const topPendingEvaluated = projectCredits
      .filter((credit) => credit.state !== "APPROVED" && credit.state !== "complete")
      .slice(0, 3)
      .map(credit => submissionReadinessEngine.generateContextString(credit, projectDocs))
      .join("\n");
    if (topPendingEvaluated) {
      lines.push(`\n--- SUBMISSION READINESS ---`);
      lines.push(topPendingEvaluated);
    }

    // --- Evidence graph for recent files ---
    const recentFilesGraph = projectDocs
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .slice(0, 2)
      .map(doc => evidenceGraphEngine.generateContextString(doc, projectCredits))
      .join("\n");
    if (recentFilesGraph) {
      lines.push(`\n--- EVIDENCE GRAPH ---`);
      lines.push(recentFilesGraph);
    }

    // --- Strategy ---
    const strategy = certificationStrategyEngine.getStrategy(projectCredits);
    lines.push(`\n--- CERTIFICATION STRATEGY ---`);
    lines.push(certificationStrategyEngine.generateContextString(strategy));

    // --- Guidebooks ---
    const projectGuidebooks = guidebooks
      .filter((book) => book.project_id === project.id)
      .filter((book, index, all) => all.findIndex((entry) => entry.file_name === book.file_name) === index)
      .slice(0, 3);
    const latestGuidebook = projectGuidebooks
      .slice()
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0];
    lines.push(`Guidebook: ${projectGuidebooks.length ? projectGuidebooks.map((book) => `${book.title} (${book.file_name})`).join("; ") : "none uploaded"}`);
    lines.push(`Manual version lock: ${latestGuidebook ? `${latestGuidebook.file_name}@${latestGuidebook.created_at ?? "unknown"}` : "none"}`);
  }

  return lines.join("\n");
}

export async function getWorkspaceSnapshot() {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return { user: null, role: "consultant", projectIds: [], snapshot: "User is not signed in.", userName: "", userEmail: "" };
  }

  const { data: profile } = await client
    .from("profiles")
    .select("global_role, full_name, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const userName = profile?.full_name
    ?? (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "")
    ?? "";
  const userEmail = profile?.email ?? user.email ?? "";
  const metadataRole = typeof user.user_metadata?.role === "string" ? user.user_metadata.role : "";
  const resolvedRole = (profile?.global_role ?? metadataRole ?? "consultant") as string;
  const isSuperUser =
    resolvedRole === "super_user" ||
    resolvedRole === "super_admin" ||
    resolvedRole === "L5" ||
    resolvedRole === "L3" ||
    metadataRole === "super_user" ||
    metadataRole === "superuser";
  const reader = isSuperUser && env.supabaseServiceRoleKey ? createAdminClient() : client;

  const { data: projectsData } = await reader
    .from("projects")
    .select("id, name, client, location, certification_type, status")
    .order("created_at", { ascending: false })
    .limit(20);

  const projects = (projectsData ?? []) as ProjectRow[];
  const projectIds = projects.map((project) => project.id);

  if (!projectIds.length) {
    return { user, role: resolvedRole, projectIds, snapshot: "No projects currently available in the workspace.", userName, userEmail };
  }

  // P0 Fix: Expanded credit select with ALL runtime fields including assignment
  const [creditsResult, documentsResult] = await Promise.all([
    reader
      .from("project_credits")
      .select(
        "id, project_id, credit_code, credit_name, status, category, category_name, " +
        "assigned_user_id, responsible_role, completion_pct, max_points, is_mandatory, " +
        "documents_required, what_to_submit, blocked_by"
      )
      .in("project_id", projectIds)
      .order("credit_code"),
    reader
      .from("project_document")
      .select("id, project_id, file_name, doc_category, state, uploaded_at")
      .in("project_id", projectIds)
      .order("uploaded_at", { ascending: false })
      .limit(400),
  ]);

  if (creditsResult.error) console.error("Credits Error:", creditsResult.error);
  if (documentsResult.error) console.error("Documents Error:", documentsResult.error);

  // Map DB result: status → state for compatibility with CreditRow type
  const credits = ((creditsResult.data ?? []) as any[]).map((c) => ({
    ...c,
    state: c.status ?? "DRAFT",
  })) as CreditRow[];

  const documents = (documentsResult.data ?? []) as DocumentRow[];

  // P0 Fix: Resolve all assigned_user_ids to profile names in one query
  const assignedUserIds = [...new Set(credits.map((c) => c.assigned_user_id).filter(Boolean))] as string[];
  const profileMap: ProfileMap = new Map();
  if (assignedUserIds.length > 0) {
    const { data: profilesData } = await reader
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", assignedUserIds);
    for (const p of profilesData ?? []) {
      profileMap.set(p.user_id, { full_name: p.full_name ?? "Unknown", email: p.email ?? "" });
    }
  }

  const { data: guidebooksData } = await reader
    .from("project_guidebooks")
    .select("project_id, title, file_name, created_at")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  const guidebooks = (guidebooksData ?? []) as Array<{ project_id: string; title: string; file_name: string; created_at?: string }>;

  const { data: intelligence } = await reader
    .from("document_intelligence")
    .select("*")
    .in("document_id", documents.slice(0, 5).map(d => d.id));

  const creditAssignmentGraph = await getCreditAssignmentGraph(projectIds, credits, reader);
  let snapshot = buildWorkspaceSnapshot(projects, credits, documents, resolvedRole, guidebooks, profileMap, creditAssignmentGraph);

  if (intelligence?.length) {
    snapshot += "\n\n--- DOCUMENT INTELLIGENCE ---\n";
    for (const intel of intelligence) {
      const doc = documents.find(d => d.id === intel.document_id);
      snapshot += `- ${doc?.file_name}: ${intel.summary} [Relevance: ${intel.relevance_score}%] Risks: ${intel.risks?.join(", ") || "None"}\n`;
    }
  }

  return { user, role: resolvedRole, projectIds, snapshot, userName, userEmail };
}
