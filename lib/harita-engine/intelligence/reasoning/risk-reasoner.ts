import { ReasoningOutput } from "./reasoning-engine";
import { KnowledgeGraphEngine } from "../knowledge-graph/knowledge-graph-engine";

import { ExplanationEngine } from "../explanations/explanation-engine";

export class RiskReasoner {
  public static evaluate(query: string, runtimeContext: any, graphContext: any): ReasoningOutput {
    const q = query.toLowerCase();
    const creditMatch = runtimeContext.credits.find((c: any) => q.includes(c.credit_code.toLowerCase()));
    
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

    const creditId = creditMatch.id || creditMatch.credit_code;
    const projectId = runtimeContext.project?.id || "unknown";
    const docs = runtimeContext.documents.filter((d: any) => d.doc_category === creditMatch.credit_code);
    
    const risks: { level: string, detail: string }[] = [];
    
    // 1. Rejected Documents
    if (docs.some((d: any) => d.state === "REJECTED")) {
      risks.push({ level: "CRITICAL", detail: "Rejected documents require immediate resubmission." });
    }

    // 2. Unassigned Requirements
    const assignments = KnowledgeGraphEngine.queryGraph(projectId).queryAssignments(projectId, creditId);
    if (assignments.length > 0) {
      const unassigned = assignments.filter((r: any) => !r.contributorName);
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
    const pendingReview = docs.filter((d: any) => d.state === "UNDER_L3_REVIEW" || d.state === "SUBMITTED");
    if (pendingReview.length > 0) {
       risks.push({ level: "LOW", detail: `${pendingReview.length} document(s) are stuck in the review queue.` });
    }

    const explanation = ExplanationEngine.explainRisk({ completion: creditMatch.completion_pct });

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
      return (w[b.level as keyof typeof w] || 0) - (w[a.level as keyof typeof w] || 0);
    });

    const highestRisk = rankedRisks[0];

    return {
      consultantAssessment: `The highest risk for ${creditMatch.credit_code} is: ${highestRisk.detail}`,
      evidence: rankedRisks.map(r => `- [${r.level}] ${r.detail}`).join("\n"),
      igbcInterpretation: explanation,
      risks: "Multiple compounding risks can delay the entire project submission timeline.",
      recommendations: ExplanationEngine.explainRecommendation({ highestImpact: highestRisk.detail })
    };
  }
}
