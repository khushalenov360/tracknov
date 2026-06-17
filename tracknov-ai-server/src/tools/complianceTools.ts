import type { FunctionDeclaration } from "@google/genai";
import type { HaritaContext } from "../services/vertexService";
import { getProjectCreditCatalog, getProjectSnapshot } from "../services/supabaseService";
import { lookupGuidebookClause } from "../services/guidebookService";

const igbcThresholdModel = {
  version: "1.0.0",
  thresholdVersion: "1.0.0",
  ratingSystem: "IGBC Green Interiors",
  totalPoints: {
    new: 100,
    existing: 75,
  },
  certificationLevels: [
    { level: "Certified", new: [50, 59], existing: [37, 44], recognition: "Best Practices" },
    { level: "Silver", new: [60, 69], existing: [45, 52], recognition: "Outstanding Performance" },
    { level: "Gold", new: [70, 79], existing: [53, 60], recognition: "National Excellence" },
    { level: "Platinum", new: [80, 100], existing: [61, 75], recognition: "Global Leadership" },
  ],
} as const;

type IgbcVariant = keyof typeof igbcThresholdModel.totalPoints;

export const calculateCreditGapDeclaration: FunctionDeclaration = {
  name: "calculate_credit_gap",
  description: "Calculate the exact credit delta between current earned points and target points.",
  parametersJsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      current: {
        type: "number",
        description: "Current verified points earned by the project or credit.",
      },
      target: {
        type: "number",
        description: "Target points required to achieve the next threshold or requested goal.",
      },
    },
    required: ["current", "target"],
  },
};

export const getComplianceThresholdsDeclaration: FunctionDeclaration = {
  name: "get_compliance_thresholds",
  description: "Return the verified IGBC certification thresholds for the active project, requested variant, or target rating.",
  parametersJsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      frameworkId: {
        type: "string",
        description: "Optional framework identifier or rating-system label.",
      },
      variant: {
        type: "string",
        enum: ["new", "existing"],
        description: "IGBC project variant when explicitly known.",
      },
      targetRating: {
        type: "string",
        description: "Optional rating band such as Certified, Silver, Gold, or Platinum.",
      },
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
      projectCreditId: {
        type: "string",
        description: "Optional project credit id for an exact credit-level compliance baseline.",
      },
      creditCode: {
        type: "string",
        description: "Optional credit code for an exact credit-level compliance baseline.",
      },
    },
  },
};

export const lookupGuidebookClauseDeclaration: FunctionDeclaration = {
  name: "lookup_guidebook_clause",
  description: "Retrieve relevant IGBC guidebook clauses, headings, and formula references for a standards or compliance question.",
  parametersJsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      query: {
        type: "string",
        description: "The exact standards or compliance question to search inside the guidebook.",
      },
      topic: {
        type: "string",
        description: "Optional short topic such as embodied energy, low VOC, or lighting power density.",
      },
      creditCode: {
        type: "string",
        description: "Optional credit code such as EE C1 or IE MR 2.",
      },
      limit: {
        type: "number",
        description: "Optional maximum number of clause matches to return.",
      },
    },
    required: ["query"],
  },
};

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

function toTitleCase(value: string) {
  const normalized = normalizeLabel(value);
  if (!normalized) return null;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizeVariant(value: unknown): IgbcVariant | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeLabel(value);
  if (normalized === "new" || normalized.includes("new")) return "new";
  if (normalized === "existing" || normalized.includes("existing")) return "existing";
  return null;
}

function normalizeRating(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = normalizeLabel(value);
  return igbcThresholdModel.certificationLevels.find((entry) => normalizeLabel(entry.level) === normalized) ?? null;
}

function buildVariantThresholds(variant: IgbcVariant) {
  return {
    variant,
    total_points_available: igbcThresholdModel.totalPoints[variant],
    thresholds: igbcThresholdModel.certificationLevels.map((entry) => ({
      level: entry.level,
      min_points: entry[variant][0],
      max_points: entry[variant][1],
      recognition: entry.recognition,
    })),
  };
}

async function resolveThresholdContext(args: Record<string, unknown>, context?: HaritaContext) {
  const lookup = {
    projectId: typeof args.projectId === "string" ? args.projectId : context?.projectId,
    title: typeof args.title === "string" ? args.title : context?.title,
    currentItem: typeof args.currentItem === "string" ? args.currentItem : context?.currentItem,
  };

  const hasLookup = Boolean(lookup.projectId || lookup.title || lookup.currentItem);
  if (!hasLookup) {
    return null;
  }

  const snapshot = await getProjectSnapshot(lookup);
  return snapshot.matchFound ? snapshot.project ?? null : null;
}

export async function getComplianceThresholds(args: Record<string, unknown>, context?: HaritaContext) {
  const project = await resolveThresholdContext(args, context);
  const creditCatalog = project
    ? await getProjectCreditCatalog({
        projectId: project.id,
        title: project.name,
        currentItem: typeof args.currentItem === "string" ? args.currentItem : context?.currentItem,
      })
    : null;
  const requestedProjectCreditId = typeof args.projectCreditId === "string" ? args.projectCreditId : null;
  const requestedCreditCode = typeof args.creditCode === "string" ? normalizeLabel(args.creditCode) : null;
  const exactCredit = creditCatalog?.credits.find((credit) => {
    if (requestedProjectCreditId && credit.id === requestedProjectCreditId) return true;
    if (requestedCreditCode && normalizeLabel(credit.credit_code || "") === requestedCreditCode) return true;
    return false;
  }) || null;
  const explicitVariant = normalizeVariant(args.variant);
  const inferredVariant = explicitVariant || normalizeVariant(project?.certification_type);
  const requestedRating = normalizeRating(args.targetRating) || normalizeRating(project?.target_rating);

  const newThresholds = buildVariantThresholds("new");
  const existingThresholds = buildVariantThresholds("existing");

  return {
    source_of_truth: "tracknov/lib/igbc-scoring.ts",
    ruleset_version: igbcThresholdModel.version,
    threshold_version: igbcThresholdModel.thresholdVersion,
    framework: typeof args.frameworkId === "string"
      ? args.frameworkId
      : project?.certification_type || igbcThresholdModel.ratingSystem,
    project_context: project
      ? {
          id: project.id,
          name: project.name,
          target_rating: project.target_rating,
          certification_type: project.certification_type,
        }
      : null,
    credit_specific_thresholds: exactCredit
      ? {
          project_credit_id: exactCredit.id,
          credit_code: exactCredit.credit_code,
          credit_name: exactCredit.credit_name,
          responsible_role: exactCredit.responsible_role,
          what_to_submit: exactCredit.what_to_submit,
          required_document_types: (exactCredit.documents_required || [])
            .filter((entry) => entry.required)
            .map((entry) => entry.type)
            .filter((value): value is string => Boolean(value)),
        }
      : null,
    inferred_variant: inferredVariant,
    requested_rating: requestedRating?.level ?? toTitleCase(String(args.targetRating || project?.target_rating || "")),
    thresholds: inferredVariant
      ? buildVariantThresholds(inferredVariant)
      : {
          variants: [newThresholds, existingThresholds],
          note: "Project variant was not explicit in the available context, so both verified IGBC threshold bands are returned.",
        },
    requested_rating_threshold: requestedRating
      ? {
          level: requestedRating.level,
          new: {
            min_points: requestedRating.new[0],
            max_points: requestedRating.new[1],
          },
          existing: {
            min_points: requestedRating.existing[0],
            max_points: requestedRating.existing[1],
          },
          recognition: requestedRating.recognition,
        }
      : null,
  };
}

export function getGuidebookClause(args: Record<string, unknown>, context?: HaritaContext) {
  return lookupGuidebookClause({
    query: String(args.query || "").trim(),
    topic: typeof args.topic === "string" ? args.topic : undefined,
    creditCode: typeof args.creditCode === "string" ? args.creditCode : undefined,
    limit: typeof args.limit === "number" ? args.limit : undefined,
  }, context);
}

export function calculateCreditGap(args: Record<string, unknown>) {
  const current = Number(args.current ?? 0);
  const target = Number(args.target ?? 0);

  if (!Number.isFinite(current) || !Number.isFinite(target)) {
    throw new Error("calculate_credit_gap requires numeric current and target values.");
  }

  const delta = Number((target - current).toFixed(2));
  const progressRatio = target > 0 ? Number((current / target).toFixed(4)) : 0;

  return {
    current,
    target,
    delta,
    status: delta <= 0 ? "TARGET_MET" : "GAP_REMAINING",
    progress_ratio: progressRatio,
    progress_pct: Number((progressRatio * 100).toFixed(2)),
  };
}
