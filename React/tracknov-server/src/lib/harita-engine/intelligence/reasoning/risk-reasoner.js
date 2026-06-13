"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskReasoner = void 0;
const knowledge_graph_engine_1 = require("../knowledge-graph/knowledge-graph-engine");
const explanation_engine_1 = require("../explanations/explanation-engine");
class RiskReasoner {
    static evaluate(query, runtimeContext, graphContext) {
        var _a;
        const q = query.toLowerCase();
        const creditMatch = runtimeContext.credits.find((c) => q.includes(c.credit_code.toLowerCase()));
        if (!creditMatch) {
            if (runtimeContext.project) {
                return {
                    consultantAssessment: "I have analyzed the project context for risks.",
                    evidence: "Based on the provided workspace snapshot.",
                    igbcInterpretation: "Risk analysis requires a specific credit context to provide targeted insight.",
                    risks: "No specific risks evaluated in this general query.",
                    recommendations: "Please specify a credit or ask a targeted question."
                };
            }
            return {
                consultantAssessment: "I cannot determine which credit you want me to analyze for risks.",
                evidence: "No valid credit code found in query.",
                igbcInterpretation: "Risk analysis requires a specific credit context.",
                risks: "Unable to evaluate.",
                recommendations: "Please specify a credit code, e.g., 'EDA C1'."
            };
        }
        if (creditMatch.na) {
            return {
                consultantAssessment: `${creditMatch.credit_code} is marked as Not Required (Not Applicable) for this project.`,
                evidence: "Credit is excluded from project scope (na = true).",
                igbcInterpretation: "Not applicable credits do not carry risks.",
                risks: "None (Credit is NA)",
                recommendations: "No action required. This credit is excluded from the project's certification score."
            };
        }
        const creditId = creditMatch.id || creditMatch.credit_code;
        const projectId = ((_a = runtimeContext.project) === null || _a === void 0 ? void 0 : _a.id) || "unknown";
        const docs = runtimeContext.documents.filter((d) => d.doc_category === creditMatch.credit_code);
        const risks = [];
        // 1. Rejected Documents
        if (docs.some((d) => d.state === "REJECTED")) {
            risks.push({ level: "CRITICAL", detail: "Rejected documents require immediate resubmission." });
        }
        // 2. Unassigned Requirements
        const assignments = knowledge_graph_engine_1.KnowledgeGraphEngine.queryGraph(projectId).queryAssignments(projectId, creditId);
        if (assignments.length > 0) {
            const unassigned = assignments.filter((r) => !r.contributorName);
            if (unassigned.length > 0) {
                risks.push({ level: "HIGH", detail: `${unassigned.length} documentation requirement(s) are unassigned.` });
            }
        }
        // 3. Blocked state
        if (creditMatch.status === "BLOCKED") {
            risks.push({ level: "CRITICAL", detail: `Credit is blocked by: ${creditMatch.blocked_by || "an unspecified factor"}.` });
        }
        // 4. Low Completion vs Time (Simulated)
        if (creditMatch.completion_pct !== null && creditMatch.completion_pct < 25) {
            risks.push({ level: "MEDIUM", detail: `Credit completion is critically low (${creditMatch.completion_pct}%).` });
        }
        // 5. Review Bottleneck
        const pendingReview = docs.filter((d) => d.state === "UNDER_L3_REVIEW" || d.state === "SUBMITTED");
        if (pendingReview.length > 0) {
            risks.push({ level: "LOW", detail: `${pendingReview.length} document(s) are stuck in the review queue.` });
        }
        const explanation = explanation_engine_1.ExplanationEngine.explainRisk({ completion: creditMatch.completion_pct });
        if (risks.length === 0) {
            return {
                consultantAssessment: `There are no significant risks detected for ${creditMatch.credit_code} at this time.`,
                evidence: "- All requirements assigned\n- No rejected documents\n- Not blocked",
                igbcInterpretation: explanation,
                risks: "None detected.",
                recommendations: "Continue with the standard submission workflow."
            };
        }
        const rankedRisks = risks.sort((a, b) => {
            const w = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
            return (w[b.level] || 0) - (w[a.level] || 0);
        });
        const highestRisk = rankedRisks[0];
        return {
            consultantAssessment: `The highest risk for ${creditMatch.credit_code} is: ${highestRisk.detail}`,
            evidence: rankedRisks.map(r => `- [${r.level}] ${r.detail}`).join("\n"),
            igbcInterpretation: explanation,
            risks: "Multiple compounding risks can delay the entire project submission timeline.",
            recommendations: explanation_engine_1.ExplanationEngine.explainRecommendation({ highestImpact: highestRisk.detail })
        };
    }
}
exports.RiskReasoner = RiskReasoner;
