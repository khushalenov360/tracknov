import type { FunctionDeclaration } from "@google/genai";
import type { HaritaContext, WritePermission } from "../services/vertexService";
import { assignComplianceTask, checkDocumentPipeline, getProjectSnapshot } from "../services/supabaseService";

export const getProjectSnapshotDeclaration: FunctionDeclaration = {
  name: "get_project_snapshot",
  description: "Fetch the live project snapshot from Supabase including credits, documents, assignments, roles, and top blockers.",
  parametersJsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      projectId: {
        type: "string",
        description: "Project id when it is already known.",
      },
      title: {
        type: "string",
        description: "Project title when the request references the project by name.",
      },
      currentItem: {
        type: "string",
        description: "Current UI route such as /projects/<id>/overview.",
      },
    },
  },
};

export const checkDocumentPipelineDeclaration: FunctionDeclaration = {
  name: "check_document_pipeline",
  description: "Inspect required documents, uploaded documents, assignments, and recent remarks for a project or a specific credit.",
  parametersJsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      projectId: {
        type: "string",
        description: "Project id when it is already known.",
      },
      creditId: {
        type: "string",
        description: "Project credit id for a credit-level document pipeline inspection.",
      },
      title: {
        type: "string",
        description: "Project title when the request references the project by name.",
      },
      currentItem: {
        type: "string",
        description: "Current UI route such as /projects/<id>/documents.",
      },
    },
  },
};

export const assignComplianceTaskDeclaration: FunctionDeclaration = {
  name: "assign_compliance_task",
  description: "Create a real Tracknov compliance follow-up task for a project role. This tool must only execute when confirm is true.",
  parametersJsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      projectId: { type: "string", description: "Project id when it is already known." },
      creditId: { type: "string", description: "Optional project credit id to scope the task." },
      title: { type: "string", description: "Project title when the request references the project by name." },
      currentItem: { type: "string", description: "Current UI route such as /projects/<id>/assignments." },
      details: { type: "string", description: "Clear operational description of the remediation or follow-up task." },
      role: { type: "string", description: "Target project role such as architect, mep, contractor, consultant, owner, or project_admin." },
      due: { type: "string", description: "Optional due date string in YYYY-MM-DD format." },
      taskType: { type: "string", description: "Optional task type. Defaults to compliance_followup." },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
      confirm: { type: "boolean", description: "Must be true before the server creates a real task row." },
    },
    required: ["details", "role", "confirm"],
  },
};

function mergeContextArgs(args: Record<string, unknown>, context?: HaritaContext) {
  return {
    projectId: typeof args.projectId === "string" ? args.projectId : context?.projectId,
    title: typeof args.title === "string" ? args.title : context?.title,
    currentItem: typeof args.currentItem === "string" ? args.currentItem : context?.currentItem,
  };
}

export async function runPmTool(
  name: string,
  args: Record<string, unknown>,
  context?: HaritaContext,
  writePermission?: WritePermission,
) {
  const lookup = mergeContextArgs(args, context);

  switch (name) {
    case "get_project_snapshot":
      return getProjectSnapshot(lookup);
    case "check_document_pipeline":
      return checkDocumentPipeline({
        ...lookup,
        creditId: typeof args.creditId === "string" ? args.creditId : undefined,
      });
    case "assign_compliance_task":
      return assignComplianceTask({
        ...lookup,
        creditId: typeof args.creditId === "string" ? args.creditId : undefined,
        details: String(args.details || "").trim(),
        role: String(args.role || "").trim(),
        due: typeof args.due === "string" ? args.due : null,
        taskType: typeof args.taskType === "string" ? args.taskType : undefined,
        priority: typeof args.priority === "string"
          ? (args.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL")
          : undefined,
        confirm: Boolean(args.confirm) && Boolean(writePermission?.taskCreationConfirmed),
      });
    default:
      throw new Error(`Unsupported PM tool: ${name}`);
  }
}
