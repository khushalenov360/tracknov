import type { HaritaContext } from "../services/vertexService";
import type { HaritaIntentSignal } from "./intentRouter";

export type SequenceDirective = {
  shouldInject: boolean;
  title: string;
  guidance: string[];
  enforcedToolNames: string[];
};

function projectLabel(context?: HaritaContext) {
  return context?.title || context?.projectId || "the active project";
}

export function buildSequenceDirective(intentSignal: HaritaIntentSignal, context?: HaritaContext): SequenceDirective {
  const label = projectLabel(context);

  switch (intentSignal.intent) {
    case "credit_applicability":
      return {
        shouldInject: true,
        title: "Credit Applicability Sequence",
        enforcedToolNames: ["get_credit_applicability", "get_compliance_thresholds", "lookup_guidebook_clause"],
        guidance: [
          `Treat the user as asking whether a credit applies or what it depends on inside ${label}.`,
          "Use verified applicability, mandatory-requirement, and dependency signals before answering.",
          "If there is no explicit rule mapping, say that clearly and fall back only to the runtime mandatory requirements and required document types.",
          "Do not invent dependencies from generic credit names.",
        ],
      };
    case "evidence_intelligence":
      return {
        shouldInject: true,
        title: "Evidence Intelligence Sequence",
        enforcedToolNames: ["get_evidence_intelligence", "check_document_pipeline"],
        guidance: [
          `Treat the user as asking for the evidence state inside ${label}.`,
          "Prioritize missing required document types, extracted evidence signals, recommendation confidence, and evidence graph gaps.",
          "Separate verified uploaded proof from AI recommendations.",
          "If no evidence extraction exists yet, say that directly instead of inferring one.",
        ],
      };
    case "score_model":
      return {
        shouldInject: true,
        title: "Multi-layer Score Model Sequence",
        enforcedToolNames: ["get_score_model", "calculate_credit_gap", "get_compliance_thresholds"],
        guidance: [
          `Treat the user as asking for the certification scoring model inside ${label}.`,
          "Keep the answer layered: certification summary, credit score totals, projection layer, and risk layer.",
          "Do not collapse risk-adjusted and verified earned points into a single number.",
          "If thresholds are referenced, use the threshold tool before explaining rating movement.",
        ],
      };
    case "clarification_intelligence":
      return {
        shouldInject: true,
        title: "Clarification Intelligence Sequence",
        enforcedToolNames: ["get_clarification_intelligence", "check_document_pipeline"],
        guidance: [
          `Treat the user as asking about clarification loops inside ${label}.`,
          "Report open remarks, latest clarification plans, and lifecycle metrics separately.",
          "Call out stale clarification rounds explicitly when they exist.",
          "Do not treat ordinary document absence as a clarification unless there are actual remarks or clarification records.",
        ],
      };
    case "guidebook_lookup":
      return {
        shouldInject: true,
        title: "Guidebook Clause Retrieval Sequence",
        enforcedToolNames: ["lookup_guidebook_clause", "get_compliance_thresholds"],
        guidance: [
          `Treat the user as asking for an authoritative standards lookup for ${label}.`,
          "Use guidebook retrieval before answering standards, clause, definition, or formula questions.",
          "Cite heading paths, clause text, and formula references only.",
          "Do not cite page numbers because the current guidebook asset is plain markdown without reliable page markers.",
        ],
      };
    case "credit_gap":
      return {
        shouldInject: true,
        title: "Threshold Gap Sequence",
        enforcedToolNames: ["get_compliance_thresholds", "calculate_credit_gap", "get_project_snapshot"],
        guidance: [
          `Treat the user as asking for an exact threshold or points gap inside ${label}.`,
          "Use the verified IGBC threshold tool before doing any points math.",
          "If the project variant is not explicit, state that and keep new-project versus existing-project thresholds separate.",
          "Never estimate threshold numbers from prose. Use only tool-returned values.",
        ],
      };
    case "prioritization":
      return {
        shouldInject: true,
        title: "Execution Priority Sequence",
        enforcedToolNames: ["get_project_snapshot", "check_document_pipeline"],
        guidance: [
          `Treat the user as asking for the next operational move inside ${label}.`,
          "Rank actions by lowest completion first, then by missing required evidence, then by unassigned required document types, then by repeated remarks.",
          "Do not provide generic advice. Convert the answer into a sequenced action list with explicit owners when available.",
          "If no project facts are available, say exactly which project snapshot or document evidence is missing.",
        ],
      };
    case "blockers":
      return {
        shouldInject: true,
        title: "Blocker Isolation Sequence",
        enforcedToolNames: ["get_project_snapshot", "get_evidence_intelligence", "get_clarification_intelligence"],
        guidance: [
          `Treat the user as asking for the strongest blockers inside ${label}.`,
          "Identify blockers in this order: missing evidence, no uploaded proof, repeated clarification loops, no active assignment, low completion credits.",
          "List only verified blockers. Do not speculate about blockers that are not supported by live data.",
        ],
      };
    case "assignment":
      return {
        shouldInject: true,
        title: "Assignment Responsibility Sequence",
        enforcedToolNames: ["get_project_snapshot", "check_document_pipeline"],
        guidance: [
          `Treat the user as asking about assignment ownership inside ${label}.`,
          "Prefer live assignment roles and responsible_role values over generic role assumptions.",
          "If a required document type is not assigned, say UNASSIGNED explicitly and recommend the next owner based on available project roles only.",
        ],
      };
    case "task_writeback":
      return {
        shouldInject: true,
        title: "Confirmation Gated Task Creation",
        enforcedToolNames: ["assign_compliance_task", "get_project_snapshot"],
        guidance: [
          `Treat the user as asking to create a real follow-up task inside ${label}.`,
          "Never create a task silently. First present the resolved assignee, task details, priority, and due date.",
          "Only execute task creation when confirm=true is explicitly provided through the tool call.",
          "If the assignee role cannot be resolved to a real project member, stop and report that clearly.",
        ],
      };
    default:
      return {
        shouldInject: false,
        title: "Default Flow",
        enforcedToolNames: [],
        guidance: [],
      };
  }
}
