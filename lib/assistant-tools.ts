import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { projectService } from "@/lib/services/project-service";
import { creditService } from "@/lib/services/credit-service";
import { reviewService } from "@/lib/services/review-service";
import { documentService } from "@/lib/services/document-service";
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
];

function toGeminiTools(): Record<string, unknown>[] {
  return [
    {
      functionDeclarations: TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
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

export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "User is not authenticated." };

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
          documents: credit.documents.map((d) => ({
            id: d.id,
            fileName: d.file_name,
            docCategory: d.doc_category,
            status: d.status,
            workflowState: d.workflow_state,
            version: d.version,
            uploadedAt: d.uploaded_at,
          })),
          remarks: credit.remarks.map((r) => ({
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

        const result = await reviewService.transitionDocument(user, {
          documentId,
          projectId,
          newState,
          manualSubmit: true,
          remarks: remarks || null,
          idempotencyKey: String(args.idempotencyKey ?? ""),
        });
        return { ok: true, data: `Document ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "sent back for clarification"} successfully.` };
      } catch (error: any) {
        return { ok: false, error: error.message ?? "Failed to review document." };
      }
    }

    case "setCreditState": {
      try {
        const projectId = String(args.projectId ?? "");
        const creditCode = String(args.creditCode ?? "");
        const action = String(args.action ?? "") as "complete" | "blocked";
        if (action !== "complete" && action !== "blocked") return { ok: false, error: "Action must be 'complete' or 'blocked'." };
        const creditId = await resolveCreditId(projectId, creditCode.toUpperCase());
        if (!creditId) return { ok: false, error: `Credit ${creditCode} not found.` };
        const targetState = action === "complete" ? "APPROVED" : "REJECTED";
        await creditService.setCreditState(user, {
          projectId,
          creditId,
          state: targetState,
          remarks: String(args.blockedBy ?? ""),
        });
        return { ok: true, data: `Credit ${creditCode} marked as ${action}.` };
      } catch (error: any) {
        return { ok: false, error: error.message ?? "Failed to update credit state." };
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

    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}
