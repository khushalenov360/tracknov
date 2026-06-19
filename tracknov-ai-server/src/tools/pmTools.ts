import type { FunctionDeclaration } from "@google/genai";
import type { HaritaContext, WritePermission } from "../services/vertexService";
import {
  assignComplianceTask,
  checkDocumentPipeline,
  getClarificationIntelligence,
  getCreditApplicability,
  getEvidenceIntelligence,
  getProjectSnapshot,
  getScoreModel,
} from "../services/supabaseService";

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

export const getCreditApplicabilityDeclaration: FunctionDeclaration = {
  name: "get_credit_applicability",
  description: "Return verified credit applicability, mandatory requirements, prerequisite dependencies, and runtime blockers for a project credit.",
  parametersJsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      projectId: { type: "string", description: "Project id when it is already known." },
      creditId: { type: "string", description: "Project credit id for an exact applicability lookup." },
      creditCode: { type: "string", description: "Credit code such as WC C1 or EDA C2." },
      title: { type: "string", description: "Project title when the request references the project by name." },
      currentItem: { type: "string", description: "Current UI route such as /projects/<id>/credits." },
    },
  },
};

export const getEvidenceIntelligenceDeclaration: FunctionDeclaration = {
  name: "get_evidence_intelligence",
  description: "Return verified evidence intelligence for a project or credit: missing document types, AI recommendations, evidence extractions, and evidence graph signals.",
  parametersJsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      projectId: { type: "string", description: "Project id when it is already known." },
      creditId: { type: "string", description: "Project credit id for a credit-scoped evidence read." },
      creditCode: { type: "string", description: "Credit code such as WC C1 or IM MR1." },
      title: { type: "string", description: "Project title when the request references the project by name." },
      currentItem: { type: "string", description: "Current UI route such as /projects/<id>/documents." },
    },
  },
};

export const getScoreModelDeclaration: FunctionDeclaration = {
  name: "get_score_model",
  description: "Return the multi-layer score model for a project including certification summary, credit score totals, projection layer, and risk layer.",
  parametersJsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      projectId: { type: "string", description: "Project id when it is already known." },
      title: { type: "string", description: "Project title when the request references the project by name." },
      currentItem: { type: "string", description: "Current UI route such as /projects/<id>/overview." },
    },
  },
};

export const getClarificationIntelligenceDeclaration: FunctionDeclaration = {
  name: "get_clarification_intelligence",
  description: "Return clarification intelligence for a project or credit including open remarks, AI clarification plans, and clarification lifecycle metrics.",
  parametersJsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      projectId: { type: "string", description: "Project id when it is already known." },
      creditId: { type: "string", description: "Project credit id for a credit-scoped clarification read." },
      creditCode: { type: "string", description: "Credit code such as EDA C1 or WC C1." },
      title: { type: "string", description: "Project title when the request references the project by name." },
      currentItem: { type: "string", description: "Current UI route such as /projects/<id>/clarifications." },
    },
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
    case "get_credit_applicability":
      return getCreditApplicability({
        ...lookup,
        creditId: typeof args.creditId === "string" ? args.creditId : undefined,
        creditCode: typeof args.creditCode === "string" ? args.creditCode : undefined,
      });
    case "get_evidence_intelligence":
      return getEvidenceIntelligence({
        ...lookup,
        creditId: typeof args.creditId === "string" ? args.creditId : undefined,
        creditCode: typeof args.creditCode === "string" ? args.creditCode : undefined,
      });
    case "get_score_model":
      return getScoreModel(lookup);
    case "get_clarification_intelligence":
      return getClarificationIntelligence({
        ...lookup,
        creditId: typeof args.creditId === "string" ? args.creditId : undefined,
        creditCode: typeof args.creditCode === "string" ? args.creditCode : undefined,
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
