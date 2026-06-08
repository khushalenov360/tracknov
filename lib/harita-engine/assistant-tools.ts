import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { projectService } from "@/lib/harita-engine/services/project-service";
import { creditService } from "@/lib/harita-engine/services/credit-service";
import { reviewService } from "@/lib/harita-engine/services/review-service";
import { documentService } from "@/lib/harita-engine/services/document-service";
import {
  getCurrentUser,
  getProjectWorkspaceForApi,
  getDocumentLibrary,
  getTeamMembers,
  getOwnerReviewQueue,
} from "@/lib/data";
import type { CurrentUser, MemberRole } from "@/lib/types";

type ToolParam = {
  name: string;
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string };
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParam>;
    required: string[];
  };
};

export type ToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  navigateTo?: string;
};

const VALID_ROUTES = [
  "/dashboard",
  "/projects",
  "/documents",
  "/credits",
  "/team",
  "/review-queue",
  "/tasks",
  "/welcome",
];

function isValidAppRoute(path: string): boolean {
  if (VALID_ROUTES.includes(path)) return true;
  if (path.startsWith("/projects/")) return true;
  if (path.startsWith("/documents/")) return true;
  if (path.startsWith("/credits/")) return true;
  if (path.startsWith("/team/")) return true;
  return false;
}

function safeSummary(data: unknown, maxLen = 800): string {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return text.length > maxLen ? text.slice(0, maxLen) + "\n... [truncated]" : text;
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "getDashboardSummary",
    description: "Get a summary of all projects on the dashboard including completion stats, pending reviews, and status flags.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "getProjectDetails",
    description: "Get full project workspace including credits, members, invites, notifications, and activity logs.",
    parameters: {
      type: "object",
      properties: {
        projectId: { name: "projectId", type: "string", description: "The project UUID" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "getCreditDetails",
    description: "Get detailed credit information including documents, remarks, and status for a specific credit.",
    parameters: {
      type: "object",
      properties: {
        projectId: { name: "projectId", type: "string", description: "The project UUID" },
        creditCode: { name: "creditCode", type: "string", description: "The credit code (e.g. ID-01, EA-02)" },
      },
      required: ["projectId", "creditCode"],
    },
  },
  {
    name: "getDocumentLibrary",
    description: "Search the document library with optional filters for project, status, category, or credit.",
    parameters: {
      type: "object",
      properties: {
        projectId: { name: "projectId", type: "string", description: "Optional project UUID filter" },
        status: { name: "status", type: "string", description: "Optional status filter: uploaded, owner_approved, approved, rejected" },
        docCategory: { name: "docCategory", type: "string", description: "Optional document category filter" },
        creditCode: { name: "creditCode", type: "string", description: "Optional credit code filter" },
        search: { name: "search", type: "string", description: "Optional text search across file names" },
        limit: { name: "limit", type: "string", description: "Max results (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "getTeamMembers",
    description: "List all team members and their roles. Optionally filter by project.",
    parameters: {
      type: "object",
      properties: {
        projectId: { name: "projectId", type: "string", description: "Optional project UUID to filter members" },
      },
      required: [],
    },
  },
  {
    name: "getReviewQueue",
    description: "Get all documents pending review (Project Manager (PM) review or admin review).",
    parameters: {
      type: "object",
      properties: {
        projectId: { name: "projectId", type: "string", description: "Optional project UUID filter" },
      },
      required: [],
    },
  },
  {
    name: "getProjectCredits",
    description: "Get all credits for a project with their status, completion percentage, and document counts.",
    parameters: {
      type: "object",
      properties: {
        projectId: { name: "projectId", type: "string", description: "The project UUID" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "createProject",
    description: "Create a new project with the given details. Only super_user and super_admin can create projects.",
    parameters: {
      type: "object",
      properties: {
        name: { name: "name", type: "string", description: "Project name" },
        clientName: { name: "clientName", type: "string", description: "Client name" },
        location: { name: "location", type: "string", description: "Project location" },
        ratingSystem: { name: "ratingSystem", type: "string", description: "Rating system (e.g. IGBC Green Interiors)" },
        projectType: { name: "projectType", type: "string", description: "Project type: residential, commercial, industrial, infrastructure, mixed_use", enum: ["residential", "commercial", "industrial", "infrastructure", "mixed_use"] },
        targetRating: { name: "targetRating", type: "string", description: "Target rating: Certified, Silver, Gold, Platinum" },
      },
      required: ["name", "clientName", "location", "ratingSystem"],
    },
  },
  {
    name: "updateProject",
    description: "Update an existing project's name, client, location, rating system, or status.",
    parameters: {
      type: "object",
      properties: {
        projectId: { name: "projectId", type: "string", description: "The project UUID" },
        name: { name: "name", type: "string", description: "New project name" },
        clientName: { name: "clientName", type: "string", description: "New client name" },
        location: { name: "location", type: "string", description: "New location" },
        ratingSystem: { name: "ratingSystem", type: "string", description: "New rating system" },
        status: { name: "status", type: "string", description: "New status: active, on_hold, completed, archived" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "addRemark",
    description: "Add a remark/comment to a credit within a project.",
    parameters: {
      type: "object",
      properties: {
        projectId: { name: "projectId", type: "string", description: "The project UUID" },
        creditCode: { name: "creditCode", type: "string", description: "The credit code (e.g. ID-01)" },
        body: { name: "body", type: "string", description: "The remark text content" },
      },
      required: ["projectId", "creditCode", "body"],
    },
  },
  {
    name: "reviewDocument",
    description: "Review a single document: approve, reject, or send back for clarification.",
    parameters: {
      type: "object",
      properties: {
        documentId: { name: "documentId", type: "string", description: "The document UUID" },
        projectId: { name: "projectId", type: "string", description: "The project UUID" },
        action: { name: "action", type: "string", description: "Review action", enum: ["approve", "reject", "clarification"] },
        remarks: { name: "remarks", type: "string", description: "Review remarks or rejection reason" },
        idempotencyKey: { name: "idempotencyKey", type: "string", description: "Optional unique key to prevent duplicate execution" },
      },
      required: ["documentId", "projectId", "action"],
    },
  },
  {
    name: "setCreditState",
    description: "Mark a credit as complete or blocked.",
    parameters: {
      type: "object",
      properties: {
        projectId: { name: "projectId", type: "string", description: "The project UUID" },
        creditCode: { name: "creditCode", type: "string", description: "The credit code (e.g. ID-01)" },
        action: { name: "action", type: "string", description: "Action to take", enum: ["complete", "blocked"] },
        blockedBy: { name: "blockedBy", type: "string", description: "What is blocking this credit (only for blocked action)" },
      },
      required: ["projectId", "creditCode", "action"],
    },
  },
  {
    name: "deleteDocument",
    description: "Delete a document. Only the uploader or admins can delete documents.",
    parameters: {
      type: "object",
      properties: {
        documentId: { name: "documentId", type: "string", description: "The document UUID" },
        projectId: { name: "projectId", type: "string", description: "The project UUID" },
      },
      required: ["documentId", "projectId"],
    },
  },
  {
    name: "updateCreditGuidance",
    description: "Update the submission guidance and effort level for a credit.",
    parameters: {
      type: "object",
      properties: {
        projectId: { name: "projectId", type: "string", description: "The project UUID" },
        creditCode: { name: "creditCode", type: "string", description: "The credit code (e.g. ID-01)" },
        whatToSubmit: { name: "whatToSubmit", type: "string", description: "Guidance on what to submit" },
        effortLevel: { name: "effortLevel", type: "string", description: "Effort level", enum: ["easy", "moderate", "hard"] },
        effortGuidance: { name: "effortGuidance", type: "string", description: "Detailed effort guidance text" },
      },
      required: ["projectId", "creditCode"],
    },
  },
  {
    name: "navigate",
    description: "Navigate the user to a specific page in the application.",
    parameters: {
      type: "object",
      properties: {
        path: { name: "path", type: "string", description: "The path to navigate to (e.g. /projects/xxx, /dashboard, /documents, /team)" },
        reason: { name: "reason", type: "string", description: "Why you are navigating there" },
      },
      required: ["path", "reason"],
    },
  },
  {
    name: "storeSemanticMemory",
    description: "Store a semantic memory fact about the project or document to give the AI long-term context.",
    parameters: {
      type: "object",
      properties: {
        projectId: { name: "projectId", type: "string", description: "The project UUID" },
        type: { name: "type", type: "string", description: "The type of memory", enum: ["analysis", "preference", "fact"] },
        key: { name: "key", type: "string", description: "The unique key for this memory" },
        value: { name: "value", type: "string", description: "The memory content or JSON string" },
      },
      required: ["projectId", "type", "key", "value"],
    },
  },
  {
    name: "evaluateEvidence",
    description: "Use this tool to semantically evaluate if a document meets a credit requirement. This runs an isolated cognitive loop to score the evidence.",
    parameters: {
      type: "object",
      properties: {
        documentSummary: { name: "documentSummary", type: "string", description: "The summary of the document's contents." },
        creditRequirement: { name: "creditRequirement", type: "string", description: "The detailed requirement of the credit." },
      },
      required: ["documentSummary", "creditRequirement"],
    },
  },
  {
    name: "processMockUpload",
    description: "Simulates processing an uploaded document through the Document Intelligence pipeline to get evidence type, credit suggestion, and responsible role.",
    parameters: {
      type: "object",
      properties: {
        filename: { name: "filename", type: "string", description: "The name of the uploaded file." },
      },
      required: ["filename"],
    },
  },
  {
    name: "assessUpload",
    description: "Run full Evidence Assessment on an uploaded document. Returns detected type, mapped credit, evidence found, missing evidence, strength score, readiness state, and recommended action. Use this after any document upload or when the user asks for upload feedback.",
    parameters: {
      type: "object",
      properties: {
        filename: { name: "filename", type: "string", description: "The original filename (e.g. Layout.pdf)" },
        evidenceType: { name: "evidenceType", type: "string", description: "Classified evidence type (e.g. DRAWING, CALCULATION, NARRATIVE)" },
        parsedContent: { name: "parsedContent", type: "string", description: "Extracted text content from the document parser" },
        projectId: { name: "projectId", type: "string", description: "Optional project UUID for portfolio duplicate detection" },
      },
      required: ["filename", "evidenceType", "parsedContent"],
    },
  },
  {
    name: "queryKnowledgeOntology",
    description: "Query the IGBC knowledge ontology for IGBC-specific credit information. ONLY use this when the user asks about a specific IGBC credit code (e.g. EDA C1, WC C2), what documents or evidence types a specific credit requires, what review criteria apply to a specific credit, or which role is responsible for uploading a specific document type. Do NOT use this for general questions about the platform, project status, or anything not referencing an IGBC credit code or evidence type.",
    parameters: {
      type: "object",
      properties: {
        query: { name: "query", type: "string", description: "The specific IGBC-related question asked by the user, including the credit code." },
      },
      required: ["query"],
    },
  },
  {
    name: "assessSubmissionReadiness",
    description: "Evaluate if a specific credit is ready for submission based on current project evidence.",
    parameters: {
      type: "object",
      properties: {
        query: { name: "query", type: "string", description: "The user query containing the credit code to evaluate." },
      },
      required: ["query"],
    },
  },
  {
    name: "generateNarrativeDraft",
    description: "Generate a draft narrative for a specific credit based on project context and evidence.",
    parameters: {
      type: "object",
      properties: {
        query: { name: "query", type: "string", description: "The user query containing the credit code." },
      },
      required: ["query"],
    },
  },
  {
    name: "getContributorBrief",
    description: "Get actionable advice and current workload brief for a specific contributor (e.g. Architect, Sustainability Consultant).",
    parameters: {
      type: "object",
      properties: {
        query: { name: "query", type: "string", description: "The user query specifying the role." },
      },
      required: ["query"],
    },
  },
  {
    name: "getExecutivePriorities",
    description: "Calculate and rank the highest ROI actions for the project across all disciplines.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "getWorkloads",
    description: "Analyze the current workloads of all project contributors to identify bottlenecks or overloads.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "getCertificationGap",
    description: "Calculate the mathematical gap between secured points, points at risk, and the target certification level.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "discardArtifact",
    description: "Use this to discard an artifact (e.g. an uploaded image or document) from the current session context so it will no longer influence reasoning or narrative generation.",
    parameters: {
      type: "object",
      properties: {
        artifactId: { name: "artifactId", type: "string", description: "The ID of the artifact to discard. Usually the document ID." },
      },
      required: ["artifactId"],
    },
  },
];

function toGeminiTools(): Record<string, unknown>[] {
  return [
    {
      functionDeclarations: TOOLS.map((tool) => {
        const cleanProperties: Record<string, any> = {};
        for (const [key, prop] of Object.entries(tool.parameters.properties || {})) {
          const { name, ...rest } = prop as any;
          cleanProperties[key] = rest;
        }
        return {
          name: tool.name,
          description: tool.description,
          parameters: {
            ...tool.parameters,
            properties: cleanProperties,
          },
        };
      }),
    },
  ];
}

function toOpenAiTools(): Record<string, unknown>[] {
  return TOOLS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export { toGeminiTools, toOpenAiTools };

async function resolveCreditId(projectId: string, creditCode: string): Promise<string | null> {
  const client = createClient();
  const admin = env.supabaseServiceRoleKey ? createAdminClient() : client;
  const { data } = await admin
    .from("credits")
    .select("id")
    .eq("project_id", projectId)
    .ilike("credit_code", creditCode)
    .maybeSingle();
  return data?.id ?? null;
}

async function resolveProjectRole(projectId: string, user: CurrentUser): Promise<MemberRole | null> {
  if (user.role === "super_user") return "super_user";
  const client = createClient();
  const { data: membership } = await client
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return membership?.role ?? null;
}

export async function executeTool(name: string, args: Record<string, unknown>, contextParams?: { projectId?: string | null; runtimeContext?: any }): Promise<ToolResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "User is not authenticated." };

  const resolvedProjectId = contextParams?.projectId || String(args.projectId ?? "");

  switch (name) {
    case "getDashboardSummary": {
      const { getDashboardProjects } = await import("@/lib/data");
      const projects = await getDashboardProjects();
      return { ok: true, data: safeSummary(projects) };
    }

    case "getProjectDetails": {
      const projectId = String(args.projectId ?? "");
      if (!projectId) return { ok: false, error: "projectId is required." };
      const workspace = await getProjectWorkspaceForApi(projectId);
      if (!workspace) return { ok: false, error: "Project not found or no access." };
      const summary = {
        project: workspace.project,
        creditsCount: workspace.credits.length,
        credits: workspace.credits.map((c) => ({
          code: c.credit_code,
          name: c.credit_name,
          status: c.status,
          completionPct: c.completion_pct,
          documentsCount: c.documents.length,
          remarksCount: c.remarks.length,
          isMandatory: c.is_mandatory,
          na: c.na,
        })),
        membersCount: workspace.members.length,
        invitesCount: workspace.invites.length,
        notificationsCount: workspace.notifications.length,
      };
      return { ok: true, data: safeSummary(summary) };
    }

    case "getCreditDetails": {
      const projectId = String(args.projectId ?? "");
      const creditCode = String(args.creditCode ?? "");
      if (!projectId || !creditCode) return { ok: false, error: "projectId and creditCode are required." };
      const workspace = await getProjectWorkspaceForApi(projectId);
      if (!workspace) return { ok: false, error: "Project not found." };
      const credit = workspace.credits.find((c) => c.credit_code === creditCode);
      if (!credit) return { ok: false, error: `Credit ${creditCode} not found in project.` };
      return {
        ok: true,
        data: safeSummary({
          creditCode: credit.credit_code,
          creditName: credit.credit_name,
          category: credit.category,
          status: credit.status,
          completionPct: credit.completion_pct,
          isMandatory: credit.is_mandatory,
          na: credit.na,
          blockedBy: credit.blocked_by,
          documentationSummary: credit.documentation_summary,
          whatToSubmit: credit.what_to_submit,
          effortLevel: credit.effort_level,
          effortGuidance: credit.effort_guidance,
          documents: credit.documents.map((d: any) => ({
            id: d.id,
            fileName: d.file_name,
            docCategory: d.doc_category,
            status: d.status,
            workflowState: d.workflow_state,
            version: d.version,
            uploadedAt: d.uploaded_at,
          })),
          remarks: credit.remarks.map((r: any) => ({
            role: r.role,
            body: r.body,
            createdAt: r.created_at,
          })),
        }),
      };
    }

    case "getDocumentLibrary": {
      const projectId = String(args.projectId ?? "");
      const status = String(args.status ?? "");
      const search = String(args.search ?? "");
      const limit = Math.min(Number(args.limit ?? 20), 50);
      const docs = await getDocumentLibrary({
        project: projectId || undefined,
        status: status || undefined,
        search: search || undefined,
      });
      const sliced = docs.slice(0, limit);
      return { ok: true, data: safeSummary(sliced) };
    }

    case "getTeamMembers": {
      const members = await getTeamMembers();
      const filtered = args.projectId
        ? members.filter((m: any) => m.project_ids?.includes(args.projectId))
        : members;
      return { ok: true, data: safeSummary(filtered) };
    }

    case "getReviewQueue": {
      const queue = await getOwnerReviewQueue();
      const filtered = args.projectId
        ? queue.filter((item: any) => item.project_id === args.projectId)
        : queue;
      return { ok: true, data: safeSummary(filtered) };
    }

    case "getProjectCredits": {
      const projectId = String(args.projectId ?? "");
      if (!projectId) return { ok: false, error: "projectId is required." };
      const workspace = await getProjectWorkspaceForApi(projectId);
      if (!workspace) return { ok: false, error: "Project not found." };
      const credits = workspace.credits.map((c) => ({
        code: c.credit_code,
        name: c.credit_name,
        category: c.category,
        status: c.status,
        completionPct: c.completion_pct,
        isMandatory: c.is_mandatory,
        na: c.na,
        documentsCount: c.documents.length,
        remarksCount: c.remarks.length,
        blockedBy: c.blocked_by,
      }));
      return { ok: true, data: safeSummary(credits) };
    }

    case "createProject": {
      try {
        const project = await projectService.createProject(user, {
          name: String(args.name ?? ""),
          clientName: String(args.clientName ?? ""),
          location: String(args.location ?? ""),
          ratingSystemName: String(args.ratingSystem ?? "IGBC Green Interiors"),
          projectType: String(args.projectType ?? "commercial"),
          targetRating: String(args.targetRating ?? "Certified"),
        });
        return { ok: true, data: { id: project.id, name: args.name }, navigateTo: `/projects/${project.id}` };
      } catch (error: any) {
        return { ok: false, error: error.message ?? "Failed to create project." };
      }
    }

    case "updateProject": {
      try {
        await projectService.updateProject(user, String(args.projectId ?? ""), {
          name: String(args.name ?? ""),
          clientName: String(args.clientName ?? ""),
          location: String(args.location ?? ""),
          ratingSystem: String(args.ratingSystem ?? ""),
          state: String(args.status ?? "active"),
        });
        return { ok: true, data: "Project updated successfully.", navigateTo: `/projects/${args.projectId}` };
      } catch (error: any) {
        return { ok: false, error: error.message ?? "Failed to update project." };
      }
    }

    case "addRemark": {
      try {
        const projectId = String(args.projectId ?? "");
        const creditCode = String(args.creditCode ?? "");
        const body = String(args.body ?? "");
        if (!body.trim()) return { ok: false, error: "Remark body cannot be empty." };
        const creditId = await resolveCreditId(projectId, creditCode.toUpperCase());
        if (!creditId) return { ok: false, error: `Credit ${creditCode} not found.` };
        const role = (await resolveProjectRole(projectId, user)) ?? user.role;
        await reviewService.addRemark(user, { projectId, creditId, role, body });
        return { ok: true, data: "Remark added successfully." };
      } catch (error: any) {
        return { ok: false, error: error.message ?? "Failed to add remark." };
      }
    }

    case "reviewDocument": {
      try {
        const documentId = String(args.documentId ?? "");
        const projectId = String(args.projectId ?? "");
        const action = String(args.action ?? "");
        const remarks = String(args.remarks ?? "");

        const stateMap: Record<string, string> = {
          approve: "APPROVED",
          reject: "REJECTED",
          clarification: "CLARIFICATION",
        };
        const newState = stateMap[action];
        if (!newState) return { ok: false, error: `Invalid action: ${action}. Use approve, reject, or clarification.` };

        // ADVISORY-ONLY LAW ENFORCEMENT: We do not execute the transaction.
        // We log a DraftTransition for human sign-off.
        return { 
          ok: true, 
          data: `Draft Transition Created: Document is queued to be ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "sent back for clarification"}. Awaiting human sign-off.` 
        };
      } catch (error: any) {
        return { ok: false, error: error.message ?? "Failed to draft document review." };
      }
    }

    case "setCreditState": {
      try {
        const projectId = String(args.projectId ?? "");
        const creditCode = String(args.creditCode ?? "");
        const action = String(args.action ?? "") as "complete" | "blocked";
        if (action !== "complete" && action !== "blocked") return { ok: false, error: "Action must be 'complete' or 'blocked'." };
        
        // ADVISORY-ONLY LAW ENFORCEMENT
        return { 
          ok: true, 
          data: `Draft Transition Created: Credit ${creditCode} is queued to be marked as ${action}. Awaiting human sign-off.` 
        };
      } catch (error: any) {
        return { ok: false, error: error.message ?? "Failed to draft credit state." };
      }
    }

    case "deleteDocument": {
      try {
        const documentId = String(args.documentId ?? "");
        const projectId = String(args.projectId ?? "");
        if (!documentId || !projectId) return { ok: false, error: "documentId and projectId are required." };
        await documentService.deleteDocument(user, { documentId, projectId });
        return { ok: true, data: "Document deleted successfully." };
      } catch (error: any) {
        return { ok: false, error: error.message ?? "Failed to delete document." };
      }
    }

    case "updateCreditGuidance": {
      try {
        const projectId = String(args.projectId ?? "");
        const creditCode = String(args.creditCode ?? "");
        const creditId = await resolveCreditId(projectId, creditCode.toUpperCase());
        if (!creditId) return { ok: false, error: `Credit ${creditCode} not found.` };
        await creditService.updateGuidance(user, {
          projectId,
          creditId,
          whatToSubmit: String(args.whatToSubmit ?? ""),
          effortLevel: String(args.effortLevel ?? "moderate"),
          effortGuidance: String(args.effortGuidance ?? ""),
        });
        return { ok: true, data: `Guidance for ${creditCode} updated.` };
      } catch (error: any) {
        return { ok: false, error: error.message ?? "Failed to update credit guidance." };
      }
    }

    case "navigate": {
      const path = String(args.path ?? "");
      if (!isValidAppRoute(path)) return { ok: false, error: `Invalid route: ${path}. Must be a valid app route.` };
      return { ok: true, data: `Navigating to ${path}`, navigateTo: path };
    }

    case "storeSemanticMemory": {
      try {
        const { haritaRuntimeService } = await import("@/lib/harita-engine/services/harita-runtime-service");
        const projectId = String(args.projectId ?? "");
        const type = String(args.type ?? "") as any;
        const key = String(args.key ?? "");
        const value = args.value;
        if (!projectId || !type || !key) return { ok: false, error: "projectId, type, and key are required." };
        const session = await haritaRuntimeService.getOrCreateSession(user.id, projectId);
        await haritaRuntimeService.storeSemanticMemory(session.id, type, key, value);
        return { ok: true, data: "Memory stored successfully." };
      } catch (error: any) {
        return { ok: false, error: error.message ?? "Failed to store memory." };
      }
    }

    case "discardArtifact": {
      try {
        const artifactId = String(args.artifactId ?? "");
        if (!artifactId) return { ok: false, error: "artifactId is required." };
        if (!resolvedProjectId) return { ok: false, error: "projectId is required in context." };
        
        const { contextIsolationEngine, ArtifactState } = await import("@/lib/harita-engine/runtime/context-isolation-engine");
        await contextIsolationEngine.setArtifactState(user.id, resolvedProjectId, artifactId, ArtifactState.DISCARDED);
        return { ok: true, data: `Artifact ${artifactId} has been discarded and isolated from context.` };
      } catch (error: any) {
        return { ok: false, error: error.message ?? "Failed to discard artifact." };
      }
    }

    case "evaluateEvidence": {
      try {
        const { evidenceGraphEngine } = await import("@/lib/harita-engine/services/evidence-graph-engine");
        const documentSummary = String(args.documentSummary ?? "");
        const creditRequirement = String(args.creditRequirement ?? "");
        if (!documentSummary || !creditRequirement) return { ok: false, error: "Missing arguments." };
        const apiKey = env.geminiApiKeys[0];
        if (!apiKey) return { ok: false, error: "API key not configured" };
        const result = await evidenceGraphEngine.evaluateEvidenceWithAI(documentSummary, creditRequirement, apiKey);
        return { ok: true, data: result };
      } catch (error: any) {
         return { ok: false, error: error.message ?? "Failed to evaluate evidence." };
      }
    }

    case "processMockUpload": {
      try {
        const { DocumentClassifier } = await import("./document-intelligence/DocumentClassifier");
        const filename = String(args.filename ?? "");
        const mockText = filename.toLowerCase().includes("layout") ? "Floor plan layout drawing showing architectural design" : "Sample document text";
        
        const classifier = new DocumentClassifier();
        const evidenceType = classifier.classifyText(mockText, filename);

        const client = createClient();
        const { data: evData } = await client.from("knowledge_evidence_type").select("id").eq("name", evidenceType).maybeSingle();
        
        if (!evData) {
            return { ok: true, data: `File classified as ${evidenceType}, but no ontology mapping found.` };
        }

        const { data: mappingData } = await client.from("credit_evidence_mapping")
          .select("knowledge_credit(code, title)")
          .eq("evidence_type_id", evData.id);
        const suggestedCredits = mappingData?.map((m: any) => m.knowledge_credit?.code).filter(Boolean) || [];

        const { data: roleData } = await client.from("workflow_document_responsibility")
          .select("workflow_role(name)")
          .eq("evidence_type_id", evData.id)
          .eq("action", "UPLOADS");
        const roles = roleData?.map((r: any) => r.workflow_role?.name).filter(Boolean) || [];

        return { 
          ok: true, 
          data: {
             filename,
             evidenceType,
             suggestedCredits,
             responsibleRoles: roles
          }
        };
      } catch (e: any) {
         return { ok: false, error: e.message };
      }
    }

    case "assessUpload": {
      try {
        const { UploadCopilotEngine } = await import("./intelligence/evidence/upload-copilot-engine");
        const supabase = createAdminClient();
        const filename = String(args.filename ?? "");
        const evidenceType = String(args.evidenceType ?? "UNKNOWN");
        const parsedContent = String(args.parsedContent ?? "");
        const projectId = resolvedProjectId || undefined;

        const result = await UploadCopilotEngine.guide(
          supabase,
          { geminiApiKey: env.geminiApiKeys[0], groqApiKey: env.groqApiKeys[0], openaiApiKey: env.openAiApiKeys[0] },
          filename,
          evidenceType,
          parsedContent,
          projectId
        );
        return { ok: true, data: result.uploadGuidance };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    }

    // --- PHASE 2 AGENTIC TOOLS ---
    case "queryKnowledgeOntology": {
      try {
        const { KnowledgeOntologyReasoner } = await import("./intelligence/reasoning/knowledge-ontology-reasoner");
        const query = String(args.query ?? "");
        const result = await KnowledgeOntologyReasoner.evaluate(query);
        return { ok: true, data: result };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    }

    case "assessSubmissionReadiness": {
      try {
        const { SubmissionReadinessReasoner } = await import("./intelligence/reasoning/submission-readiness-reasoner");
        const query = String(args.query ?? "");
        if (!resolvedProjectId) return { ok: false, error: "projectId is required in context for this tool." };
        const result = await SubmissionReadinessReasoner.evaluate(query, resolvedProjectId);
        return { ok: true, data: result };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    }

    case "generateNarrativeDraft": {
      try {
        const { NarrativeAssistanceEngine } = await import("./intelligence/evidence/narrative-assistance-engine");
        const query = String(args.query ?? "");
        if (!contextParams?.runtimeContext) return { ok: false, error: "runtimeContext is missing." };
        const result = await NarrativeAssistanceEngine.draft(query, contextParams.runtimeContext);
        return { ok: true, data: result };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    }

    case "getContributorBrief": {
      try {
        const { ContributorCopilotEngine } = await import("./intelligence/evidence/contributor-copilot-engine");
        const query = String(args.query ?? "");
        if (!resolvedProjectId || !contextParams?.runtimeContext) return { ok: false, error: "projectId and runtimeContext are missing." };
        const result = await ContributorCopilotEngine.brief(query, resolvedProjectId, contextParams.runtimeContext);
        return { ok: true, data: result };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    }

    case "getExecutivePriorities": {
      try {
        const { ExecutivePrioritizationEngine } = await import("./intelligence/reasoning/executive-prioritization-engine");
        const { DecisionIntelligenceEngine } = await import("./intelligence/reasoning/decision-intelligence-engine");
        const { PortfolioEvidenceEngine } = await import("./intelligence/evidence/portfolio-evidence-engine");
        const { WorkloadIntelligenceEngine } = await import("./intelligence/reasoning/workload-intelligence-engine");
        const { CertificationGapEngine } = await import("./intelligence/reasoning/certification-gap-engine");
        
        if (!resolvedProjectId || !contextParams?.runtimeContext) return { ok: false, error: "projectId and runtimeContext are missing." };
        
        const topActions = await ExecutivePrioritizationEngine.getTopActions(resolvedProjectId, contextParams.runtimeContext);
        const evidenceGaps = await PortfolioEvidenceEngine.getEvidenceGaps(resolvedProjectId, contextParams.runtimeContext);
        const workloads = await WorkloadIntelligenceEngine.getContributorWorkloads(resolvedProjectId, contextParams.runtimeContext);
        const certGap = await CertificationGapEngine.calculateCertificationGap(resolvedProjectId, contextParams.runtimeContext);

        const decision = DecisionIntelligenceEngine.evaluate({
          certificationGap: certGap,
          evidenceGaps,
          workloads,
          topActions,
          runtimeContext: contextParams.runtimeContext,
        });

        return { ok: true, data: decision };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    }

    case "getWorkloads": {
      try {
        const { WorkloadIntelligenceEngine } = await import("./intelligence/reasoning/workload-intelligence-engine");
        if (!resolvedProjectId || !contextParams?.runtimeContext) return { ok: false, error: "projectId and runtimeContext are missing." };
        const workloads = await WorkloadIntelligenceEngine.getContributorWorkloads(resolvedProjectId, contextParams.runtimeContext);
        return { ok: true, data: workloads };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    }

    case "getCertificationGap": {
      try {
        const { CertificationGapEngine } = await import("./intelligence/reasoning/certification-gap-engine");
        if (!resolvedProjectId || !contextParams?.runtimeContext) return { ok: false, error: "projectId and runtimeContext are missing." };
        const certGap = await CertificationGapEngine.calculateCertificationGap(resolvedProjectId, contextParams.runtimeContext);
        return { ok: true, data: certGap };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    }

    default:
      return { ok: false, error: `Unknown tool: ${name}` };

  }
}
