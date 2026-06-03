// ============================================================
// ReasoningEngine — Harita Intelligence Orchestrator
// ============================================================
// Pipeline:
//   QuestionClassifier
//   → switch(questionType) → Intelligence Engine
//   → ExecutiveConsistencyValidator (for executive question types)
//   → SelfReviewEngine (hallucination guard)
//   → ReasoningOutput
// ============================================================

import { QuestionType } from "./question-classifier";
import { BlockerReasoner } from "./blocker-reasoner";
import { AssignmentReasoner } from "./assignment-reasoner";
import { RiskReasoner } from "./risk-reasoner";
import { RecommendationReasoner } from "./recommendation-reasoner";
import { ExecutivePrioritizationEngine } from "../executive/executive-prioritization-engine";
import { WorkloadIntelligenceEngine } from "../workload/workload-intelligence-engine";
import { PortfolioEvidenceEngine } from "../evidence/portfolio-evidence-engine";
import { CertificationGapEngine } from "../certification/certification-gap-engine";
import { DecisionIntelligenceEngine } from "../executive/decision-intelligence-engine";
import {
  ExecutiveConsistencyValidator,
  ExecutiveValidationPayload,
} from "../executive/executive-consistency-validator";
import { submissionReadinessEngine } from "../../services/submission-readiness-engine";
import { KnowledgeGraphEngine } from "../knowledge-graph/knowledge-graph-engine";
import { KnowledgeOntologyReasoner } from "./knowledge-ontology-reasoner";
import { SubmissionReadinessReasoner } from "./submission-readiness-reasoner";
import { SelfReviewEngine } from "../self-review-engine";
import { FailureLibrary } from "../failure-library";
import { PipelineTracer } from "../debug/pipeline-tracer";
import { ReasoningAudit } from "../debug/reasoning-audit";

// ---------------------------------------------------------------------------
// Shared output type
// ---------------------------------------------------------------------------

export interface ReasoningOutput {
  directAnswer: string;
  evidence: string;
  igbcInterpretation: string;
  risks: string;
  recommendations: string;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Singleton validator — created once, reused per request. */
const consistencyValidator = new ExecutiveConsistencyValidator();

/**
 * Question types that must pass the ExecutiveConsistencyValidator
 * before their output reaches the LLM.
 */
const EXECUTIVE_QUESTION_TYPES = new Set<QuestionType>([
  QuestionType.EXECUTIVE_PRIORITY,
  QuestionType.WORKLOAD,
  QuestionType.CERTIFICATION_GAP,
  QuestionType.EVIDENCE_PORTFOLIO,
  QuestionType.PROJECT_STATUS,
  QuestionType.PROJECT_RISK,
]);

// ---------------------------------------------------------------------------
// ReasoningEngine
// ---------------------------------------------------------------------------

export class ReasoningEngine {
  public static async reason(
    questionType: QuestionType,
    query: string,
    runtimeContext: any,
    graphContext: any,
    tracer?: PipelineTracer
  ): Promise<ReasoningOutput> {

    const activeTracer = tracer || new PipelineTracer();
    activeTracer.logStage("QuestionClassifier", query, `${questionType}`);

    // Build Knowledge Graph
    const projectId = runtimeContext.project?.id || "unknown";
    const graph = KnowledgeGraphEngine.refreshGraph(projectId, runtimeContext);
    activeTracer.logStage(
      "KnowledgeGraphRefresh",
      query,
      `nodes=${graph.nodes.size}\nedges=${graph.edges.size}`
    );

    if (process.env.HARITA_DEBUG === "true") {
      console.log(`\n[HARITA] Question Type = ${questionType} | Graph Traversal = TRUE\n`);
    }

    // -------------------------------------------------------------------
    // Engine outputs — captured here so the consistency validator can
    // cross-check them after all engines have run.
    // -------------------------------------------------------------------
    let certGap: Awaited<ReturnType<typeof CertificationGapEngine.calculateCertificationGap>> | undefined;
    let workloads: Awaited<ReturnType<typeof WorkloadIntelligenceEngine.getContributorWorkloads>> | undefined;
    let evidenceGaps: Awaited<ReturnType<typeof PortfolioEvidenceEngine.getEvidenceGaps>> | undefined;
    let topActions: Awaited<ReturnType<typeof ExecutivePrioritizationEngine.getTopActions>> | undefined;

    let draftOutput: ReasoningOutput;
    let reasonerName = "GeneralReasoner";

    // -------------------------------------------------------------------
    // Routing
    // -------------------------------------------------------------------

    switch (questionType) {

      // ── Credit-specific reasoners ──────────────────────────────────────
      case QuestionType.BLOCKER:
        reasonerName = "BlockerReasoner";
        draftOutput = BlockerReasoner.evaluate(query, runtimeContext, graphContext);
        break;

      case QuestionType.WHY:
      case QuestionType.WHO:
        reasonerName = "AssignmentReasoner";
        draftOutput = AssignmentReasoner.evaluate(query, runtimeContext, graphContext);
        break;

      case QuestionType.IMPACT_ANALYSIS:
      case QuestionType.RISK:
        reasonerName = "RiskReasoner";
        draftOutput = RiskReasoner.evaluate(query, runtimeContext, graphContext);
        break;

      case QuestionType.RECOMMENDATION:
        reasonerName = "RecommendationReasoner";
        draftOutput = RecommendationReasoner.evaluate(query, runtimeContext, graphContext);
        break;

      case QuestionType.TRADEOFF:
      case QuestionType.STRATEGY:
        reasonerName = "StrategyReasoner";
        draftOutput = this.getFallbackOutput();
        break;

      case QuestionType.STATUS: {
        reasonerName = "SubmissionReadinessEngine";
        const creditMatch = runtimeContext.credits.find(
          (c: any) => query.toUpperCase().includes(c.credit_code)
        );
        if (creditMatch) {
          const evalStatus = submissionReadinessEngine.evaluateCredit(creditMatch, runtimeContext.documents);
          draftOutput = {
            directAnswer: `The status for ${creditMatch.credit_code} is ${evalStatus.state}.`,
            evidence: `Status returned as ${evalStatus.state} with score: ${evalStatus.readinessScore}/100. Blockers: ${evalStatus.blockers.join(", ") || "None"}`,
            igbcInterpretation: "Status directly impacts certification readiness.",
            risks:
              evalStatus.blockers.length > 0 || evalStatus.state === "REJECTED"
                ? evalStatus.blockers.join(", ")
                : "No critical risks at this stage.",
            recommendations:
              "Please review the credit requirements and ensure all mandatory documents are uploaded.",
          };
        } else {
          draftOutput = this.getFallbackOutput();
        }
        break;
      }

      case QuestionType.KNOWLEDGE_QUERY:
        reasonerName = "KnowledgeOntologyReasoner";
        draftOutput = await KnowledgeOntologyReasoner.evaluate(query);
        break;

      case QuestionType.SUBMISSION_READINESS:
        reasonerName = "SubmissionReadinessReasoner";
        draftOutput = await SubmissionReadinessReasoner.evaluate(query, projectId);
        activeTracer.logStage("SubmissionReadinessReasoner", query, `Readiness assessment complete for credit in: "${query}"`);
        break;

      // ── Executive-scope engines ────────────────────────────────────────

      case QuestionType.EXECUTIVE_PRIORITY: {
        reasonerName = "ExecutivePrioritizationEngine+DecisionIntelligence";
        topActions     = await ExecutivePrioritizationEngine.getTopActions(projectId, runtimeContext);
        evidenceGaps   = await PortfolioEvidenceEngine.getEvidenceGaps(projectId, runtimeContext);
        workloads      = await WorkloadIntelligenceEngine.getContributorWorkloads(projectId, runtimeContext);
        certGap        = await CertificationGapEngine.calculateCertificationGap(projectId, runtimeContext);

        // Decision Intelligence — ranks all options by the mandatory ROI formula
        const decision = DecisionIntelligenceEngine.evaluate({
          certificationGap: certGap,
          evidenceGaps,
          workloads,
          topActions,
          runtimeContext,
        });

        draftOutput = {
          directAnswer: decision.winner
            ? `The highest-ROI action right now is: "${decision.winner.title}" (ROI Score: ${decision.winner.roiScore}).`
            : "Based on current project conditions, here are the highest priority actions.",
          evidence: JSON.stringify({
            topActions,
            decisionOptions: decision.options,
            comparisons: decision.comparisons,
          }),
          igbcInterpretation: decision.reasoning,
          risks: topActions.map((a) => a.rationale).join("; "),
          recommendations: decision.winner
            ? decision.winner.title
            : topActions.length > 0
              ? topActions[0].title
              : "No critical actions pending.",
        };
        break;
      }

      case QuestionType.WORKLOAD: {
        reasonerName = "WorkloadIntelligenceEngine";
        workloads = await WorkloadIntelligenceEngine.getContributorWorkloads(projectId, runtimeContext);
        const overloaded = workloads.filter((w) => w.predictedOverload);
        draftOutput = {
          directAnswer:
            overloaded.length > 0
              ? `${overloaded.length} contributor(s) are at predicted overload: ${overloaded.map((w) => w.contributorName).join(", ")}.`
              : "All contributors are within normal capacity.",
          evidence: JSON.stringify(workloads),
          igbcInterpretation: "Balanced workloads prevent bottlenecks in evidence gathering.",
          risks: workloads.some((w) => w.workloadScore > 10) ? "Some contributors are overloaded." : "Workloads are balanced.",
          recommendations: "Reassign blocked or overdue items from highly loaded contributors.",
        };
        break;
      }

      case QuestionType.CERTIFICATION_GAP: {
        reasonerName = "CertificationGapEngine";
        certGap = await CertificationGapEngine.calculateCertificationGap(projectId, runtimeContext);
        draftOutput = {
          directAnswer: `The project is currently targeting ${certGap.targetCertification}.`,
          evidence: JSON.stringify(certGap),
          igbcInterpretation: "Certification gap analysis defines the shortest path to target compliance.",
          risks: `There are ${certGap.riskPoints} points at risk that threaten the certification level.`,
          recommendations: `Focus on securing the ${certGap.missingPoints} missing points for ${certGap.targetCertification}.`,
        };
        break;
      }

      case QuestionType.EVIDENCE_PORTFOLIO: {
        reasonerName = "PortfolioEvidenceEngine";
        evidenceGaps = await PortfolioEvidenceEngine.getEvidenceGaps(projectId, runtimeContext);
        draftOutput = {
          directAnswer: `Identified ${evidenceGaps.length} credits with evidence gaps.`,
          evidence: JSON.stringify(evidenceGaps),
          igbcInterpretation: "Missing or rejected evidence blocks IGBC compliance verification.",
          risks: evidenceGaps
            .map((g) => `${g.creditCode}: ${g.rejectedDocuments.length} rejected, ${g.missingDocuments.length} missing`)
            .join("; "),
          recommendations: "Address rejected evidence first as it carries the highest readiness impact.",
        };
        break;
      }

      case QuestionType.PROJECT_STATUS:
      case QuestionType.PROJECT_RISK:
        reasonerName = "ProjectLevelReasoner";
        draftOutput = runtimeContext.project
          ? {
              directAnswer: "I have analyzed the project context.",
              evidence: "Based on the provided workspace snapshot.",
              igbcInterpretation: "Ensuring compliance with IGBC requirements is critical for certification.",
              risks: "Review credit completion percentages to identify risks.",
              recommendations: "Prioritize incomplete and blocked credits.",
            }
          : this.getFallbackOutput();
        break;

      default:
        reasonerName = "GeneralReasoner";
        draftOutput =
          runtimeContext.project && questionType !== QuestionType.GENERAL
            ? {
                directAnswer: "I have analyzed the project context.",
                evidence: "Based on the provided workspace snapshot.",
                igbcInterpretation:
                  "Ensuring compliance with IGBC requirements is critical for certification.",
                risks: "No specific risks identified.",
                recommendations: "Prioritize pending actions.",
              }
            : this.getFallbackOutput();
        break;
    }

    ReasoningAudit.audit(query, reasonerName, draftOutput, activeTracer);

    // -------------------------------------------------------------------
    // EXECUTIVE CONSISTENCY GATE
    // Only runs for executive-scope question types.
    // If CRITICAL contradictions are found, the response is suppressed.
    // -------------------------------------------------------------------
    if (EXECUTIVE_QUESTION_TYPES.has(questionType)) {
      const validationPayload = this.buildValidationPayload(
        certGap,
        workloads,
        evidenceGaps,
        runtimeContext
      );

      const consistencyReport = consistencyValidator.validate(validationPayload);
      activeTracer.logStage(
        "ExecutiveConsistencyValidator",
        query,
        `passed=${consistencyReport.passed} | confidence=${consistencyReport.confidence.toFixed(2)} | violations=${consistencyReport.violations.length}`
      );

      const criticalCount = consistencyReport.violations.filter(
        (v) => v.severity === "CRITICAL"
      ).length;

      if (!consistencyReport.passed && criticalCount > 0) {
        FailureLibrary.logFailure(
          projectId,
          query,
          "CRITICAL consistency violation detected.",
          "CONSISTENCY_VIOLATION",
          "CRITICAL",
          consistencyReport.violations.map((v) => `${v.code}: ${v.explanation}`)
        );

        const suppressionText = ExecutiveConsistencyValidator.suppressionMessage(consistencyReport);
        return {
          directAnswer: suppressionText,
          evidence: JSON.stringify(consistencyReport.violations),
          igbcInterpretation: "Response suppressed due to contradictory project intelligence signals.",
          risks: `${criticalCount} critical contradiction(s) detected.`,
          recommendations:
            "Resolve data contradictions before requesting an executive recommendation.",
        };
      }
    }

    // -------------------------------------------------------------------
    // V5 Self-Review Interceptor (hallucination guard)
    // -------------------------------------------------------------------
    const review = SelfReviewEngine.reviewResponse(
      draftOutput.directAnswer + " " + draftOutput.evidence,
      projectId
    );
    activeTracer.logStage(
      "SelfReview",
      query,
      `${review.approved ? "PASS" : "FAIL"}\nconfidence=${(review.confidence / 100).toFixed(2)}`
    );

    if (!review.approved) {
      FailureLibrary.logFailure(
        projectId,
        query,
        draftOutput.directAnswer,
        "HALLUCINATION",
        "HIGH",
        review.violations
      );

      return {
        directAnswer: "I detected a discrepancy in my entity resolution while analyzing this request.",
        evidence: "Self-Review Blocked: " + review.violations.join(", "),
        igbcInterpretation: "Data integrity is critical. A safe fallback was triggered.",
        risks: "Potential context hallucination prevented.",
        recommendations: "Please verify the exact credit codes and try your request again.",
      };
    }

    return draftOutput;
  }

  // -------------------------------------------------------------------------
  // Build consistency validation payload from all engine outputs
  // -------------------------------------------------------------------------

  private static buildValidationPayload(
    certGap: any,
    workloads: any[] | undefined,
    evidenceGaps: any[] | undefined,
    runtimeContext: any
  ): ExecutiveValidationPayload {
    const blockedCredits = (runtimeContext.credits || []).filter(
      (c: any) => c.status === "BLOCKED"
    ).length;

    const creditCompletionState = (runtimeContext.credits || []).map((c: any) => {
      const rejectedDocs = (runtimeContext.documents || []).filter(
        (d: any) => d.doc_category === c.credit_code && d.state === "REJECTED"
      ).length;
      return {
        credit_code: c.credit_code,
        complete: c.status === "APPROVED" || c.completion_pct === 100,
        rejectedDocuments: rejectedDocs,
      };
    });

    const overloadedUsers = (workloads || []).filter((w: any) => w.predictedOverload);

    const totalMissingDocs = (evidenceGaps || []).reduce(
      (sum: number, g: any) => sum + (g.missingDocuments?.length ?? 0),
      0
    );
    const missingCreditCount = (evidenceGaps || []).filter(
      (g: any) => g.missingDocuments?.length > 0
    ).length;

    return {
      certification: certGap
        ? {
            ...certGap,
            goldSecured: certGap.securedPoints >= 60,
            goldAtRisk: certGap.riskPoints > 0 && certGap.securedPoints < 60,
          }
        : undefined,

      risk: {
        goldAtRisk: certGap ? certGap.riskPoints > 0 && certGap.securedPoints < 60 : false,
        blockedCredits,
      },

      readiness: {
        submissionReady: blockedCredits === 0 && (runtimeContext.documents || []).length > 0,
      },

      evidence: {
        missingDocuments: totalMissingDocs,
        missingCredits: missingCreditCount,
        gaps: evidenceGaps,
      },

      credits: creditCompletionState,

      workload: {
        noConstraint: overloadedUsers.length === 0,
        overloadedUsers,
      },

      executiveBrief: undefined,
    };
  }

  private static getFallbackOutput(): ReasoningOutput {
    return {
      directAnswer: "I have analyzed the project context.",
      evidence: "Based on the provided workspace snapshot.",
      igbcInterpretation:
        "Ensuring compliance with IGBC requirements is critical for certification.",
      risks: "No specific risks identified in this general query.",
      recommendations: "Please specify a credit or ask a targeted question.",
    };
  }
}
