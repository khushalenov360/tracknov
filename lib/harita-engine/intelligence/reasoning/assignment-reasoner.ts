import { ReasoningOutput } from "./reasoning-engine";
import { KnowledgeGraphEngine } from "../knowledge-graph/knowledge-graph-engine";
import { ExplanationEngine } from "../explanations/explanation-engine";

export class AssignmentReasoner {
  public static evaluate(query: string, runtimeContext: any, graphContext: any): ReasoningOutput {
    const q = query.toLowerCase();
    
    // Attempt to extract credit code from query (e.g. "EDA C1")
    const creditMatch = runtimeContext.credits.find((c: any) => q.includes(c.credit_code.toLowerCase()));
    const projectId = runtimeContext.project?.id || "unknown";
    
    if (!creditMatch) {
       // Search profiles if they just asked about a role
       const roleMatch = ["architect", "mep", "contractor", "pm", "project manager"].find(r => q.includes(r));
       if (roleMatch) {
           return {
              consultantAssessment: `The ${roleMatch} role is assigned based on their specific domain expertise for the documentation required.`,
              evidence: "- Domain expertise mapping",
              igbcInterpretation: "Proper assignment ensures high-quality evidence is gathered for compliance.",
              risks: "Incorrect assignments can lead to rejected documentation.",
              recommendations: "Specify a credit code to see exactly what they are assigned to do."
           };
       }

       if (runtimeContext.project) {
         return {
           consultantAssessment: "I have analyzed the project context for assignments.",
           evidence: "Based on the provided workspace snapshot.",
           igbcInterpretation: "IGBC workflows rely on role-specific assignments across the project.",
           risks: "No specific risks identified in this general query.",
           recommendations: "Please specify a credit or ask a targeted question."
         };
       }

      return {
        consultantAssessment: "I cannot determine which credit or assignment you are asking about.",
        evidence: "No valid credit code found in query.",
        igbcInterpretation: "IGBC workflows rely on role-specific assignments.",
        risks: "None.",
        recommendations: "Please specify a credit code, e.g., 'EDA C1'."
      };
    }

    if (creditMatch.na) {
      return {
        consultantAssessment: `${creditMatch.credit_code} is marked as Not Required (Not Applicable) for this project.`,
        evidence: "Credit is excluded from project scope (na = true).",
        igbcInterpretation: "Not applicable credits do not require assignments.",
        risks: "None (Credit is NA)",
        recommendations: "No action required. This credit is excluded from the project's certification score."
      };
    }

    const creditId = creditMatch.id || creditMatch.credit_code;
    const assignments = KnowledgeGraphEngine.queryGraph(projectId).queryAssignments(projectId, creditId);

    if (assignments.length === 0) {
      return {
        consultantAssessment: `For ${creditMatch.credit_code}, the credit is broadly assigned to ${creditMatch.responsible_role || "a single owner"}.`,
        evidence: `Overall Assignment: ${creditMatch.responsible_role || "Unknown"}`,
        igbcInterpretation: "This credit does not currently have granular multi-contributor splits.",
        risks: "A single owner might become a bottleneck if the documentation is complex.",
        recommendations: "Ensure the assigned owner has the necessary resources."
      };
    }

    // See if they asked about a specific role (e.g., "architect")
    const specificRole = ["architect", "mep", "contractor", "pm", "project manager", "unassigned"].find(r => q.includes(r));
    let relevantAssignments = assignments;

    if (specificRole) {
      relevantAssignments = assignments.filter((req: any) => 
        (req.contributorName || "").toLowerCase().includes(specificRole) ||
        (specificRole === "unassigned" && !req.contributorName)
      );
    }

    if (relevantAssignments.length === 0) {
      return {
        consultantAssessment: `The ${specificRole || "specified role"} does not have explicit assignments for ${creditMatch.credit_code}.`,
        evidence: "- No matching requirements in the graph.",
        igbcInterpretation: "Assignments should be delegated to the roles possessing the correct domain knowledge.",
        risks: "None.",
        recommendations: "Review the credit assignment table to delegate properly."
      };
    }

    const tasks = relevantAssignments.map((req: any) => req.requirementType);

    const explanation = ExplanationEngine.explainAssignment({
      credit: creditMatch.credit_code,
      requirement: tasks.join(" and "),
      owner: specificRole || "assigned team"
    });

    return {
      consultantAssessment: `For ${creditMatch.credit_code}, the ${specificRole || "assigned team"} is responsible for providing the ${tasks.join(" and ")}.`,
      evidence: relevantAssignments.map((req: any) => `- ${req.requirementType} is assigned to ${req.contributorName || "Unassigned"}`).join("\n"),
      igbcInterpretation: explanation,
      risks: "If this assignment is not fulfilled, the credit cannot be reviewed or submitted.",
      recommendations: `Ensure the ${specificRole || "assignee"} uploads the required ${tasks[0]} as soon as possible.`
    };
  }
}
