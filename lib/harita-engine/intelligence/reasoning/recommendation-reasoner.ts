import { ReasoningOutput } from "./reasoning-engine";
import { KnowledgeGraphEngine } from "../knowledge-graph/knowledge-graph-engine";
import { ExplanationEngine } from "../explanations/explanation-engine";

export class RecommendationReasoner {
  public static evaluate(query: string, runtimeContext: any, graphContext: any): ReasoningOutput {
    const q = query.toLowerCase();
    const creditMatch = runtimeContext.credits.find((c: any) => q.includes(c.credit_code.toLowerCase()));
    
    if (!creditMatch) {
      if (runtimeContext.project) {
        return {
          consultantAssessment: "I have analyzed the project context for recommendations.",
          evidence: "Based on the provided workspace snapshot.",
          igbcInterpretation: "Targeted recommendations require a specific IGBC credit context.",
          risks: "No specific risks evaluated in this general query.",
          recommendations: "Please specify a credit or ask a targeted question."
        };
      }
      return {
        consultantAssessment: "I cannot determine which credit you need a recommendation for.",
        evidence: "No valid credit code found in the query.",
        igbcInterpretation: "Targeted recommendations require a specific IGBC credit context.",
        risks: "No specific risks evaluated.",
        recommendations: "Please specify a credit code, e.g., 'EDA C1'."
      };
    }

    const creditId = creditMatch.id || creditMatch.credit_code;
    const projectId = runtimeContext.project?.id || "unknown";
    const docs = runtimeContext.documents.filter((d: any) => d.doc_category === creditMatch.credit_code);
    
    const actions: { priority: number, action: string, rationale: string }[] = [];

    // 1. Unassigned Requirements
    const assignments = KnowledgeGraphEngine.queryGraph(projectId).queryAssignments(projectId, creditId);
    if (assignments.length > 0) {
      const unassigned = assignments.filter((r: any) => !r.contributorName);
      if (unassigned.length > 0) {
        actions.push({ 
          priority: 100, 
          action: `Assign the ${unassigned.length} outstanding documentation requirements to specific team members.`, 
          rationale: "Unassigned requirements create accountability gaps that indefinitely halt progress." 
        });
      }
    }

    // 2. Rejected Documents
    const rejectedDocs = docs.filter((d: any) => d.state === "REJECTED");
    if (rejectedDocs.length > 0) {
      actions.push({ 
        priority: 90, 
        action: `Review and resubmit the ${rejectedDocs.length} rejected document(s) (e.g. ${rejectedDocs.map((d: any) => d.file_name).join(', ')}).`, 
        rationale: "Rejected evidence strictly prevents submission until deficiencies are corrected." 
      });
    }

    // 3. Blocked state
    if (creditMatch.status === "BLOCKED") {
      actions.push({ 
        priority: 110, 
        action: `Investigate and resolve the manual block applied by ${creditMatch.blocked_by || "an unspecified user/process"}.`, 
        rationale: "A manual block supersedes all other workflow states and must be cleared administratively." 
      });
    }

    // 4. Low Completion
    if (creditMatch.completion_pct !== null && creditMatch.completion_pct < 50 && creditMatch.status !== "BLOCKED" && rejectedDocs.length === 0) {
       actions.push({ 
         priority: 70, 
         action: `Accelerate evidence gathering to improve the ${creditMatch.completion_pct}% completion rate.`, 
         rationale: "Low completion percentages indicate significant missing documentation needed for IGBC compliance." 
       });
    }

    // 5. Pending Review
    const pendingReview = docs.filter((d: any) => d.state === "UNDER_L3_REVIEW" || d.state === "SUBMITTED");
    if (pendingReview.length > 0 && actions.length === 0) {
       actions.push({ 
         priority: 80, 
         action: `Follow up with the L3 reviewer for the ${pendingReview.length} pending document(s).`, 
         rationale: "Clearing the review bottleneck will immediately convert these items to approved status." 
       });
    }

    if (actions.length === 0) {
      return {
        consultantAssessment: `No immediate corrective actions are required for ${creditMatch.credit_code}.`,
        evidence: "- All requirements assigned\n- No rejected documents\n- Not blocked",
        igbcInterpretation: "The credit is well-positioned for IGBC compliance.",
        risks: "None detected.",
        recommendations: "Maintain current progress and continue standard monitoring."
      };
    }

    const sortedActions = actions.sort((a, b) => b.priority - a.priority);
    const topAction = sortedActions[0];

    return {
      consultantAssessment: `The highest impact action for ${creditMatch.credit_code} is: ${topAction.action}`,
      evidence: sortedActions.map((a, i) => `${i + 1}. ${a.action} (Rationale: ${a.rationale})`).join("\n"),
      igbcInterpretation: `Executing this recommendation directly resolves the primary barrier to IGBC compliance for ${creditMatch.credit_code}.`,
      risks: "Failing to address this recommendation leaves the credit vulnerable to prolonged delays.",
      recommendations: ExplanationEngine.explainRecommendation({ highestImpact: topAction.action })
    };
  }
}
