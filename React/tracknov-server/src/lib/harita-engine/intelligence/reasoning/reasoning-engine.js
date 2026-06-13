"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReasoningEngine = void 0;
const question_classifier_1 = require("./question-classifier");
const blocker_reasoner_1 = require("./blocker-reasoner");
const assignment_reasoner_1 = require("./assignment-reasoner");
const risk_reasoner_1 = require("./risk-reasoner");
const recommendation_reasoner_1 = require("./recommendation-reasoner");
const executive_prioritization_engine_1 = require("../executive/executive-prioritization-engine");
const workload_intelligence_engine_1 = require("../workload/workload-intelligence-engine");
const portfolio_evidence_engine_1 = require("../evidence/portfolio-evidence-engine");
const certification_gap_engine_1 = require("../certification/certification-gap-engine");
const decision_intelligence_engine_1 = require("../executive/decision-intelligence-engine");
const executive_consistency_validator_1 = require("../executive/executive-consistency-validator");
const submission_readiness_engine_1 = require("../../services/submission-readiness-engine");
const knowledge_graph_engine_1 = require("../knowledge-graph/knowledge-graph-engine");
const knowledge_ontology_reasoner_1 = require("./knowledge-ontology-reasoner");
const submission_readiness_reasoner_1 = require("./submission-readiness-reasoner");
const narrative_assistance_engine_1 = require("../narrative/narrative-assistance-engine");
const clarification_assistance_engine_1 = require("../clarification/clarification-assistance-engine");
const contributor_copilot_engine_1 = require("../contributor/contributor-copilot-engine");
const self_review_engine_1 = require("../self-review-engine");
const failure_library_1 = require("../failure-library");
const pipeline_tracer_1 = require("../debug/pipeline-tracer");
const reasoning_audit_1 = require("../debug/reasoning-audit");
// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------
/** Singleton validator — created once, reused per request. */
const consistencyValidator = new executive_consistency_validator_1.ExecutiveConsistencyValidator();
/**
 * Question types that must pass the ExecutiveConsistencyValidator
 * before their output reaches the LLM.
 */
const EXECUTIVE_QUESTION_TYPES = new Set([
    question_classifier_1.QuestionType.EXECUTIVE_PRIORITY,
    question_classifier_1.QuestionType.WORKLOAD,
    question_classifier_1.QuestionType.CERTIFICATION_GAP,
    question_classifier_1.QuestionType.EVIDENCE_PORTFOLIO,
    question_classifier_1.QuestionType.PROJECT_STATUS,
    question_classifier_1.QuestionType.PROJECT_RISK,
]);
// ---------------------------------------------------------------------------
// ReasoningEngine
// ---------------------------------------------------------------------------
class ReasoningEngine {
    static reason(questionType, query, runtimeContext, graphContext, tracer) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const activeTracer = tracer || new pipeline_tracer_1.PipelineTracer();
            activeTracer.logStage("QuestionClassifier", query, `${questionType}`);
            // Build Knowledge Graph
            const projectId = ((_a = runtimeContext.project) === null || _a === void 0 ? void 0 : _a.id) || "unknown";
            const graph = knowledge_graph_engine_1.KnowledgeGraphEngine.refreshGraph(projectId, runtimeContext);
            activeTracer.logStage("KnowledgeGraphRefresh", query, `nodes=${graph.nodes.size}\nedges=${graph.edges.size}`);
            if (process.env.HARITA_DEBUG === "true") {
                console.log(`\n[HARITA] Question Type = ${questionType} | Graph Traversal = TRUE\n`);
            }
            // -------------------------------------------------------------------
            // Engine outputs — captured here so the consistency validator can
            // cross-check them after all engines have run.
            // -------------------------------------------------------------------
            let certGap;
            let workloads;
            let evidenceGaps;
            let topActions;
            let draftOutput;
            let reasonerName = "GeneralReasoner";
            // -------------------------------------------------------------------
            // Routing
            // -------------------------------------------------------------------
            switch (questionType) {
                // ── Credit-specific reasoners ──────────────────────────────────────
                case question_classifier_1.QuestionType.BLOCKER:
                    reasonerName = "BlockerReasoner";
                    draftOutput = blocker_reasoner_1.BlockerReasoner.evaluate(query, runtimeContext, graphContext);
                    break;
                case question_classifier_1.QuestionType.WHY:
                case question_classifier_1.QuestionType.WHO:
                    reasonerName = "AssignmentReasoner";
                    draftOutput = assignment_reasoner_1.AssignmentReasoner.evaluate(query, runtimeContext, graphContext);
                    break;
                case question_classifier_1.QuestionType.IMPACT_ANALYSIS:
                case question_classifier_1.QuestionType.RISK:
                    reasonerName = "RiskReasoner";
                    draftOutput = risk_reasoner_1.RiskReasoner.evaluate(query, runtimeContext, graphContext);
                    break;
                case question_classifier_1.QuestionType.RECOMMENDATION:
                    reasonerName = "RecommendationReasoner";
                    draftOutput = recommendation_reasoner_1.RecommendationReasoner.evaluate(query, runtimeContext, graphContext);
                    break;
                case question_classifier_1.QuestionType.TRADEOFF:
                case question_classifier_1.QuestionType.STRATEGY:
                    reasonerName = "StrategyReasoner";
                    draftOutput = this.getFallbackOutput();
                    break;
                case question_classifier_1.QuestionType.STATUS: {
                    reasonerName = "SubmissionReadinessEngine";
                    const creditMatch = runtimeContext.credits.find((c) => query.toUpperCase().includes(c.credit_code));
                    if (creditMatch) {
                        const evalStatus = submission_readiness_engine_1.submissionReadinessEngine.evaluateCredit(creditMatch, runtimeContext.documents);
                        draftOutput = {
                            consultantAssessment: `The status for ${creditMatch.credit_code} is ${evalStatus.approvalStatus}.`,
                            evidence: `Status returned as ${evalStatus.approvalStatus} with score: ${evalStatus.readinessScore}/100. Blockers: ${evalStatus.blockers.join(", ") || "None"}`,
                            igbcInterpretation: `Based on the uploaded documents, the credit is ${evalStatus.readyForSubmission ? 'ready' : 'not ready'}.`,
                            risks: evalStatus.blockers.length > 0 || !evalStatus.readyForSubmission
                                ? evalStatus.blockers.join(", ") || evalStatus.recommendedAction
                                : evalStatus.recommendedAction,
                            recommendations: "Please review the credit requirements and ensure all mandatory documents are uploaded.",
                        };
                    }
                    else {
                        draftOutput = this.getFallbackOutput();
                    }
                    break;
                }
                case question_classifier_1.QuestionType.KNOWLEDGE_QUERY:
                    reasonerName = "KnowledgeOntologyReasoner";
                    draftOutput = yield knowledge_ontology_reasoner_1.KnowledgeOntologyReasoner.evaluate(query);
                    break;
                case question_classifier_1.QuestionType.SUBMISSION_READINESS:
                    reasonerName = "SubmissionReadinessReasoner";
                    draftOutput = yield submission_readiness_reasoner_1.SubmissionReadinessReasoner.evaluate(query, projectId);
                    activeTracer.logStage("SubmissionReadinessReasoner", query, `Readiness assessment complete for credit in: "${query}"`);
                    break;
                case question_classifier_1.QuestionType.NARRATIVE_ASSISTANCE:
                    reasonerName = "NarrativeAssistanceEngine";
                    draftOutput = yield narrative_assistance_engine_1.NarrativeAssistanceEngine.draft(query, runtimeContext);
                    activeTracer.logStage("NarrativeAssistanceEngine", query, "Narrative draft generated.");
                    break;
                case question_classifier_1.QuestionType.CLARIFICATION_ASSISTANCE:
                    reasonerName = "ClarificationAssistanceEngine";
                    draftOutput = yield clarification_assistance_engine_1.ClarificationAssistanceEngine.draft(query, projectId, runtimeContext);
                    activeTracer.logStage("ClarificationAssistanceEngine", query, "Clarification draft generated.");
                    break;
                case question_classifier_1.QuestionType.CONTRIBUTOR_COPILOT:
                    reasonerName = "ContributorCopilotEngine";
                    draftOutput = yield contributor_copilot_engine_1.ContributorCopilotEngine.brief(query, projectId, runtimeContext);
                    activeTracer.logStage("ContributorCopilotEngine", query, "Contributor brief generated.");
                    break;
                // ── Executive-scope engines ────────────────────────────────────────
                case question_classifier_1.QuestionType.EXECUTIVE_PRIORITY: {
                    reasonerName = "ExecutivePrioritizationEngine+DecisionIntelligence";
                    topActions = yield executive_prioritization_engine_1.ExecutivePrioritizationEngine.getTopActions(projectId, runtimeContext);
                    evidenceGaps = yield portfolio_evidence_engine_1.PortfolioEvidenceEngine.getEvidenceGaps(projectId, runtimeContext);
                    workloads = yield workload_intelligence_engine_1.WorkloadIntelligenceEngine.getContributorWorkloads(projectId, runtimeContext);
                    certGap = yield certification_gap_engine_1.CertificationGapEngine.calculateCertificationGap(projectId, runtimeContext);
                    // Decision Intelligence — ranks all options by the mandatory ROI formula
                    const decision = decision_intelligence_engine_1.DecisionIntelligenceEngine.evaluate({
                        certificationGap: certGap,
                        evidenceGaps,
                        workloads,
                        topActions,
                        runtimeContext,
                    });
                    draftOutput = {
                        consultantAssessment: decision.winner
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
                case question_classifier_1.QuestionType.WORKLOAD: {
                    reasonerName = "WorkloadIntelligenceEngine";
                    workloads = yield workload_intelligence_engine_1.WorkloadIntelligenceEngine.getContributorWorkloads(projectId, runtimeContext);
                    const overloaded = workloads.filter((w) => w.predictedOverload);
                    draftOutput = {
                        consultantAssessment: overloaded.length > 0
                            ? `${overloaded.length} contributor(s) are at predicted overload: ${overloaded.map((w) => w.contributorName).join(", ")}.`
                            : "All contributors are within normal capacity.",
                        evidence: JSON.stringify(workloads),
                        igbcInterpretation: "Balanced workloads prevent bottlenecks in evidence gathering.",
                        risks: workloads.some((w) => w.workloadScore > 10) ? "Some contributors are overloaded." : "Workloads are balanced.",
                        recommendations: "Reassign blocked or overdue items from highly loaded contributors.",
                    };
                    break;
                }
                case question_classifier_1.QuestionType.CERTIFICATION_GAP: {
                    reasonerName = "CertificationGapEngine";
                    certGap = yield certification_gap_engine_1.CertificationGapEngine.calculateCertificationGap(projectId, runtimeContext);
                    draftOutput = {
                        consultantAssessment: `The project is currently targeting ${certGap.targetCertification}.`,
                        evidence: JSON.stringify(certGap),
                        igbcInterpretation: "Certification gap analysis defines the shortest path to target compliance.",
                        risks: `There are ${certGap.riskPoints} points at risk that threaten the certification level.`,
                        recommendations: `Focus on securing the ${certGap.missingPoints} missing points for ${certGap.targetCertification}.`,
                    };
                    break;
                }
                case question_classifier_1.QuestionType.EVIDENCE_PORTFOLIO: {
                    reasonerName = "PortfolioEvidenceEngine";
                    evidenceGaps = yield portfolio_evidence_engine_1.PortfolioEvidenceEngine.getEvidenceGaps(projectId, runtimeContext);
                    draftOutput = {
                        consultantAssessment: `Identified ${evidenceGaps.length} credits with evidence gaps.`,
                        evidence: JSON.stringify(evidenceGaps),
                        igbcInterpretation: "Missing or rejected evidence blocks IGBC compliance verification.",
                        risks: evidenceGaps
                            .map((g) => `${g.creditCode}: ${g.rejectedDocuments.length} rejected, ${g.missingDocuments.length} missing`)
                            .join("; "),
                        recommendations: "Address rejected evidence first as it carries the highest readiness impact.",
                    };
                    break;
                }
                case question_classifier_1.QuestionType.PROJECT_STATUS:
                case question_classifier_1.QuestionType.PROJECT_RISK:
                    reasonerName = "ProjectLevelReasoner";
                    draftOutput = runtimeContext.project
                        ? {
                            consultantAssessment: "I have analyzed the project context.",
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
                        runtimeContext.project && questionType !== question_classifier_1.QuestionType.GENERAL
                            ? {
                                consultantAssessment: "I have analyzed the project context.",
                                evidence: "Based on the provided workspace snapshot.",
                                igbcInterpretation: "Ensuring compliance with IGBC requirements is critical for certification.",
                                risks: "No specific risks identified.",
                                recommendations: "Prioritize pending actions.",
                            }
                            : this.getFallbackOutput();
                    break;
            }
            reasoning_audit_1.ReasoningAudit.audit(query, reasonerName, draftOutput, activeTracer);
            // -------------------------------------------------------------------
            // EXECUTIVE CONSISTENCY GATE
            // Only runs for executive-scope question types.
            // If CRITICAL contradictions are found, the response is suppressed.
            // -------------------------------------------------------------------
            if (EXECUTIVE_QUESTION_TYPES.has(questionType)) {
                const validationPayload = this.buildValidationPayload(certGap, workloads, evidenceGaps, runtimeContext);
                const consistencyReport = consistencyValidator.validate(validationPayload);
                activeTracer.logStage("ExecutiveConsistencyValidator", query, `passed=${consistencyReport.passed} | confidence=${consistencyReport.confidence.toFixed(2)} | violations=${consistencyReport.violations.length}`);
                const criticalCount = consistencyReport.violations.filter((v) => v.severity === "CRITICAL").length;
                if (!consistencyReport.passed && criticalCount > 0) {
                    failure_library_1.FailureLibrary.logFailure(projectId, query, "CRITICAL consistency violation detected.", "CONSISTENCY_VIOLATION", "CRITICAL", consistencyReport.violations.map((v) => `${v.code}: ${v.explanation}`));
                    const suppressionText = executive_consistency_validator_1.ExecutiveConsistencyValidator.suppressionMessage(consistencyReport);
                    return {
                        consultantAssessment: suppressionText,
                        evidence: JSON.stringify(consistencyReport.violations),
                        igbcInterpretation: "Response suppressed due to contradictory project intelligence signals.",
                        risks: `${criticalCount} critical contradiction(s) detected.`,
                        recommendations: "Resolve data contradictions before requesting an executive recommendation.",
                    };
                }
            }
            // -------------------------------------------------------------------
            // V5 Self-Review Interceptor (hallucination guard)
            // -------------------------------------------------------------------
            const review = self_review_engine_1.SelfReviewEngine.reviewResponse(draftOutput.consultantAssessment + " " + draftOutput.evidence, projectId);
            activeTracer.logStage("SelfReview", query, `${review.approved ? "PASS" : "FAIL"}\nconfidence=${(review.confidence / 100).toFixed(2)}`);
            if (!review.approved) {
                failure_library_1.FailureLibrary.logFailure(projectId, query, draftOutput.consultantAssessment, "HALLUCINATION", "HIGH", review.violations);
                return {
                    consultantAssessment: `The credit or entity you mentioned (${review.violations.join(", ").replace(/Hallucinated Entity Detected:\s*/g, "")}) is not currently active in this project scope.`,
                    evidence: "Self-Review Blocked: " + review.violations.join(", "),
                    igbcInterpretation: "Please verify the credit code. If it belongs to a newer IGBC standard or needs to be mapped to this project, let me know.",
                    risks: "Data mismatch prevented.",
                    recommendations: "You can ask me general IGBC knowledge questions about this credit, or we can map it to your active project.",
                };
            }
            return draftOutput;
        });
    }
    // -------------------------------------------------------------------------
    // Build consistency validation payload from all engine outputs
    // -------------------------------------------------------------------------
    static buildValidationPayload(certGap, workloads, evidenceGaps, runtimeContext) {
        const blockedCredits = (runtimeContext.credits || []).filter((c) => !c.na && c.status === "BLOCKED").length;
        const creditCompletionState = (runtimeContext.credits || []).filter((c) => !c.na).map((c) => {
            const rejectedDocs = (runtimeContext.documents || []).filter((d) => d.doc_category === c.credit_code && d.state === "REJECTED").length;
            return {
                credit_code: c.credit_code,
                complete: c.status === "APPROVED" || c.completion_pct === 100,
                rejectedDocuments: rejectedDocs,
            };
        });
        const overloadedUsers = (workloads || []).filter((w) => w.predictedOverload);
        const totalMissingDocs = (evidenceGaps || []).reduce((sum, g) => { var _a, _b; return sum + ((_b = (_a = g.missingDocuments) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0); }, 0);
        const missingCreditCount = (evidenceGaps || []).filter((g) => { var _a; return ((_a = g.missingDocuments) === null || _a === void 0 ? void 0 : _a.length) > 0; }).length;
        return {
            certification: certGap
                ? Object.assign(Object.assign({}, certGap), { goldSecured: certGap.securedPoints >= 60, goldAtRisk: certGap.riskPoints > 0 && certGap.securedPoints < 60 }) : undefined,
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
    static getFallbackOutput() {
        return {
            consultantAssessment: "I have analyzed the project context.",
            evidence: "Based on the provided workspace snapshot.",
            igbcInterpretation: "Ensuring compliance with IGBC requirements is critical for certification.",
            risks: "No specific risks identified in this general query.",
            recommendations: "Please specify a credit or ask a targeted question.",
        };
    }
}
exports.ReasoningEngine = ReasoningEngine;
