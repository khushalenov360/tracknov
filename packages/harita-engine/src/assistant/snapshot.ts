import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { certificationStrategyEngine } from "@tracknov/harita-engine/services/certification-strategy-engine";
import { submissionReadinessEngine } from "@tracknov/harita-engine/services/submission-readiness-engine";
import { evidenceGraphEngine } from "@tracknov/harita-engine/services/evidence-graph-engine";

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
};

export type DocumentRow = {
  id: string;
  project_id: string;
  file_name: string;
  doc_category: string;
  state: string;
  uploaded_at: string;
};

export function buildWorkspaceSnapshot(
  projects: ProjectRow[],
  credits: CreditRow[],
  documents: DocumentRow[],
  role: string,
  guidebooks: Array<{ project_id: string; title: string; file_name: string; created_at?: string }>,
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
    const completeCredits = projectCredits.filter((credit) => credit.state === "APPROVED" || credit.state === "complete").length;
    const blockedCredits = projectCredits.filter((credit) => credit.state === "blocked").length;
    const uploadedCount = projectDocs.filter((doc) => doc.state === "READY" || doc.state === "uploaded").length;
    const ownerReviewCount = projectDocs.filter((doc) => doc.state === "SUBMITTED").length;
    const approvedCount = projectDocs.filter((doc) => doc.state === "APPROVED").length;
    const rejectedCount = projectDocs.filter((doc) => doc.state === "REJECTED" || doc.state === "CLARIFICATION").length;
    const recentFiles = projectDocs
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .slice(0, 5)
      .map((doc) =>
        role === "client" ? `${doc.doc_category}/${doc.state}` : `${doc.file_name} [${doc.doc_category}/${doc.state}]`,
      )
      .join("; ");
    const topPendingCredits = projectCredits
      .filter((credit) => credit.state !== "APPROVED" && credit.state !== "complete")
      .slice(0, 5)
      .map((credit) => `${credit.credit_code}:${credit.state}`)
      .join(", ");

    lines.push(
      `Project ${project.name} | state=${project.status ?? "unknown"} | certification=${project.certification_type ?? "n/a"} | client=${project.client ?? "n/a"} | location=${project.location ?? "n/a"}`,
    );
    let totalRequiredDocs = 0;
    for (const c of projectCredits) {
      if (Array.isArray(c.documents_required)) {
        totalRequiredDocs += c.documents_required.filter((d: any) => d.required).length;
      }
    }

    lines.push(
      `Credits: total=${projectCredits.length}, complete=${completeCredits}, blocked=${blockedCredits}. Documents: uploaded=${uploadedCount}, required=${totalRequiredDocs}, owner_review=${ownerReviewCount}, approved=${approvedCount}, rejected=${rejectedCount}.`,
    );
    
    const strategy = certificationStrategyEngine.getStrategy(projectCredits);
    lines.push(certificationStrategyEngine.generateContextString(strategy));
    
    const topPendingEvaluated = projectCredits
      .filter((credit) => credit.state !== "APPROVED" && credit.state !== "complete")
      .slice(0, 3)
      .map(credit => submissionReadinessEngine.generateContextString(credit, projectDocs))
      .join("\n");
    if (topPendingEvaluated) {
      lines.push(topPendingEvaluated);
    }
    
    const recentFilesGraph = projectDocs
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .slice(0, 2)
      .map(doc => evidenceGraphEngine.generateContextString(doc, projectCredits))
      .join("\n");
    if (recentFilesGraph) {
      lines.push(recentFilesGraph);
    }
    const projectGuidebooks = guidebooks
      .filter((book) => book.project_id === project.id)
      .filter((book, index, all) => all.findIndex((entry) => entry.file_name === book.file_name) === index)
      .slice(0, 3);
    const latestGuidebook = projectGuidebooks
      .slice()
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0];
    lines.push(
      `Guidebook: ${projectGuidebooks.length ? projectGuidebooks.map((book) => `${book.title} (${book.file_name})`).join("; ") : "none uploaded"}`,
    );
    lines.push(
      `Manual version lock: ${latestGuidebook ? `${latestGuidebook.file_name}@${latestGuidebook.created_at ?? "unknown"}` : "none"}`,
    );
    const trackerPreview = projectCredits
      .slice(0, 5)
      .map((credit) => {
        const req = (credit.documents_required ?? []).filter((d) => d.required).map((d) => d.label).slice(0, 3).join(", ");
        return `${credit.credit_code}${credit.credit_name ? ` ${credit.credit_name}` : ""} -> required: ${req || "not set"}`;
      })
      .join(" | ");
    lines.push(`Tracker rows preview: ${trackerPreview || "none"}`);
    lines.push(`Recent files: ${recentFiles || "none"}`);
    lines.push(`Priority credits: ${topPendingCredits || "none"}`);
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
    resolvedRole === "super_user" || metadataRole === "super_user" || metadataRole === "superuser";
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

  const [{ data: creditsData }, { data: documentsData }] = await Promise.all([
    reader
      .from("project_credits")
      .select("id, project_id, credit_code, credit_name, documents_required, what_to_submit, state")
      .in("project_id", projectIds)
      .order("credit_code"),
    reader
      .from("project_document")
      .select("id, project_id, file_name, doc_category, state, uploaded_at")
      .in("project_id", projectIds)
      .order("uploaded_at", { ascending: false })
      .limit(400),
  ]);
  const { data: guidebooksData } = await reader
    .from("project_guidebooks")
    .select("project_id, title, file_name, created_at")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  const credits = (creditsData ?? []) as CreditRow[];
  const documents = (documentsData ?? []) as DocumentRow[];
  const guidebooks = (guidebooksData ?? []) as Array<{ project_id: string; title: string; file_name: string; created_at?: string }>;

  const { data: intelligence } = await reader
    .from("document_intelligence")
    .select("*")
    .in("document_id", documents.slice(0, 5).map(d => d.id));

  let snapshot = buildWorkspaceSnapshot(projects, credits, documents, resolvedRole, guidebooks);
  
  if (intelligence?.length) {
    snapshot += "\n\nRecent Document Intelligence:\n";
    for (const intel of intelligence) {
      const doc = documents.find(d => d.id === intel.document_id);
      snapshot += `- ${doc?.file_name}: ${intel.summary} [Relevance: ${intel.relevance_score}%] Risks: ${intel.risks?.join(", ") || "None"}\n`;
    }
  }

  return { user, role: resolvedRole, projectIds, snapshot, userName, userEmail };
}
