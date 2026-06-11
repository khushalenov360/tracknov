import { ReasoningOutput } from "./reasoning-engine";
import { ExplanationEngine } from "../explanations/explanation-engine";

export class BlockerReasoner {
  public static evaluate(query: string, runtimeContext: any, graphContext: any): ReasoningOutput {
    // Attempt to extract credit code from query (e.g. "EDA C1")
    const creditMatch = runtimeContext.credits.find((c: any) => query.toUpperCase().includes(c.credit_code));
    
    if (!creditMatch) {
      if (runtimeContext.project) {
        return {
          consultantAssessment: "I have analyzed the project context for blockers.",
          evidence: "Based on the provided workspace snapshot.",
          igbcInterpretation: "Credit-specific blockers require a valid credit reference to evaluate properly.",
          risks: "No specific risks evaluated in this general query.",
          recommendations: "Please specify a credit or ask a targeted question."
        };
      }
      return {
        consultantAssessment: "I cannot determine which credit you are asking about.",
        evidence: "No valid credit code found in query.",
        igbcInterpretation: "Credit-specific blockers require a valid credit reference.",
        risks: "Unable to evaluate blockers.",
        recommendations: "Please specify a credit code, e.g., 'EDA C1'."
      };
    }

    if (creditMatch.na) {
      return {
        consultantAssessment: `${creditMatch.credit_code} is marked as Not Required (Not Applicable) for this project.`,
        evidence: "Credit is excluded from project scope (na = true).",
        igbcInterpretation: "Not applicable credits do not require evidence and cannot be blocked.",
        risks: "None (Credit is NA)",
        recommendations: "No action required. This credit is excluded from the project's certification score."
      };
    }

    const creditId = creditMatch.id;
    const graph = runtimeContext.creditAssignmentGraph?.get(creditId);
    const docs = runtimeContext.documents.filter((d: any) => d.doc_category === creditMatch.credit_code);
    
    const blockers: string[] = [];
    const missingDocs: string[] = [];
    
    if (creditMatch.status === "BLOCKED") {
      blockers.push(`Credit is explicitly marked as BLOCKED by: ${creditMatch.blocked_by || "an unspecified user or process"}`);
    }

    if (creditMatch.completion_pct !== null && creditMatch.completion_pct < 100) {
      blockers.push(`Credit completion is only at ${creditMatch.completion_pct}%.`);
    }

    if (graph && graph.requirements) {
      const pendingReqs = graph.requirements.filter((req: any) => {
         // Check if a document exists for this requirement type
         return !docs.some((d: any) => d.file_name.toLowerCase().includes(req.requirementType.toLowerCase()));
      });

      if (pendingReqs.length > 0) {
        pendingReqs.forEach((req: any) => {
          missingDocs.push(req.requirementType);
          blockers.push(`Missing ${req.requirementType} (Assigned to: ${req.contributorName || "an unassigned contributor"})`);
        });
      }
    } else if (creditMatch.documents_required) {
      creditMatch.documents_required.forEach((req: any) => {
        if (req.required && !docs.some((d: any) => d.file_name.includes(req.type))) {
          missingDocs.push(req.label || req.type);
          blockers.push(`Missing ${req.label || req.type}`);
        }
      });
    }

    if (docs.some((d: any) => d.state === "REJECTED")) {
      blockers.push("One or more documents have been REJECTED and require resubmission.");
    }

    if (docs.some((d: any) => d.state === "UNDER_L3_REVIEW")) {
      blockers.push("Review is pending by admin/L3.");
    }

    const consultantAssessment = blockers.length > 0 
      ? `Submission for ${creditMatch.credit_code} is blocked due to: ${blockers[0]}.` 
      : `There are currently no active blockers for ${creditMatch.credit_code}.`;
      
    const explanation = ExplanationEngine.explainBlocker({ missing: missingDocs, explicitBlockers: blockers });

    return {
      consultantAssessment,
      evidence: blockers.length > 0 ? blockers.map(b => `- ${b}`).join("\n") : "All requirements satisfied or pending standard review.",
      igbcInterpretation: blockers.length > 0 
        ? explanation 
        : "Credit is progressing normally according to IGBC standards.",
      risks: blockers.length > 0 ? "Extended blockers can delay project submission deadlines." : "No significant risks detected.",
      recommendations: blockers.length > 0 ? "Address the outstanding missing documentation immediately." : "Continue monitoring the review process."
    };
  }
}
