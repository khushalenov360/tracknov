import { ReasoningOutput } from "./reasoning/reasoning-engine";
import { QuestionType } from "./reasoning/question-classifier";

import { ResponseAudit } from "./debug/response-audit";
import { PipelineTracer } from "./debug/pipeline-tracer";
import { generateExecutiveBrief } from "../ai/planners/executiveBriefPlanner";
import { ExecutiveBriefTemplates } from "../ai/templates/executiveBriefTemplates";

export class ConsultantResponsePlannerV2 {
  private static templates: Partial<Record<QuestionType, (reasoning: ReasoningOutput, query: string) => string>> = {
    [QuestionType.BLOCKER]: (r, q) => `
[ENOV-AIT CONSULTANT: BLOCKER RESOLUTION]
The user encountered a blocker: "${q}".
Provide a direct consultant assessment.
${r.consultantAssessment}
Evidence: ${r.evidence}
Implication: ${r.igbcInterpretation}
Risk: ${r.risks}
Resolution Plan: ${r.recommendations}
Do NOT use markdown headers. Blend this into a fluent, authoritative explanation of how to unblock this.`,

    [QuestionType.RISK]: (r, q) => `
[ENOV-AIT CONSULTANT: RISK ASSESSMENT]
The user asked about risks: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Critical Risks: ${r.risks}
Mitigation: ${r.recommendations}
Deliver a serious, executive summary of the risk and immediate mitigation steps.`,

    [QuestionType.STATUS]: (r, q) => `
[ENOV-AIT CONSULTANT: READINESS/STATUS REPORT]
The user asked for status/readiness: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Requirement: ${r.igbcInterpretation}
Risks: ${r.risks}
Next Steps: ${r.recommendations}
Present this as a formal readiness update. Keep it concise.`,

    [QuestionType.STRATEGY]: (r, q) => `
[ENOV-AIT CONSULTANT: CERTIFICATION STRATEGY]
The user asked about strategy/certification: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Outline a clear, strategic path forward.`,

    [QuestionType.RECOMMENDATION]: (r, q) => `
[ENOV-AIT CONSULTANT: RECOMMENDATION]
The user asked for a recommendation: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Give a highly prescriptive, consultant-grade recommendation.`,

    [QuestionType.EXECUTIVE_PRIORITY]: (r, q) => `
[ENOV-AIT CONSULTANT: EXECUTIVE PRIORITY]
The user asked about executive priorities: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Top Actions: ${r.evidence}
Expected Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Deliver a highly prescriptive, executive-level summary of the top actions and their impact.`,

    [QuestionType.WORKLOAD]: (r, q) => `
[ENOV-AIT CONSULTANT: WORKLOAD INTELLIGENCE]
The user asked about contributor workload: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Contributor Workload: ${r.evidence}
Reason: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide a clear analysis of who is overloaded and why.`,

    [QuestionType.CERTIFICATION_GAP]: (r, q) => `
[ENOV-AIT CONSULTANT: CERTIFICATION GAP]
The user asked about certification progress: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Gap Analysis (Secured/Risk/Missing): ${r.evidence}
Current Position: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommended Credits: ${r.recommendations}
Explain the shortest path to the target certification clearly.`,

    [QuestionType.EVIDENCE_PORTFOLIO]: (r, q) => `
[ENOV-AIT CONSULTANT: PORTFOLIO EVIDENCE]
The user asked about missing or rejected evidence: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Missing and Rejected Evidence: ${r.evidence}
Readiness Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Next Actions: ${r.recommendations}
Summarize the critical document gaps threatening the portfolio.`,

    [QuestionType.PROJECT_STATUS]: (r, q) => `
[ENOV-AIT CONSULTANT: PROJECT STATUS]
The user asked about overall project status: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Summarize the current project standing.`,

    [QuestionType.PROJECT_RISK]: (r, q) => `
[ENOV-AIT CONSULTANT: PROJECT RISK]
The user asked about overall project risk: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Highlight the most critical risks affecting the project.`,

    [QuestionType.IMPACT_ANALYSIS]: (r, q) => `
[ENOV-AIT CONSULTANT: EXECUTIVE IMPACT ANALYSIS]
The user asked for an impact analysis: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide an executive-level impact briefing.`,

    [QuestionType.WHY]: (r, q) => `
[ENOV-AIT CONSULTANT: ASSIGNMENT / RATIONALE]
The user asked for assignment rationale: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Explain the reasoning behind this clearly and professionally.`,

    [QuestionType.WHO]: (r, q) => `
[ENOV-AIT CONSULTANT: ASSIGNMENT / RATIONALE]
The user asked about assignment: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Explain the assignment context clearly.`,

    [QuestionType.WHAT]: (r, q) => `
[ENOV-AIT CONSULTANT: GENERAL ADVISORY]
The user asked a general what question: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide clear, factual consultant guidance.`,

    [QuestionType.HOW]: (r, q) => `
[ENOV-AIT CONSULTANT: PROCESS ADVISORY]
The user asked how to proceed: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide step-by-step authoritative guidance.`,

    [QuestionType.TRADEOFF]: (r, q) => `
[ENOV-AIT CONSULTANT: TRADEOFF ANALYSIS]
The user asked for a tradeoff analysis: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Weigh the pros and cons logically.`,

    [QuestionType.GENERAL]: (r, q) => `
[ENOV-AIT CONSULTANT: GENERAL]
The user asked a general question: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide standard consultant context.`,

    [QuestionType.ACTION_REQUEST]: (r, q) => `
[ACTION REQUEST WORKFLOW]
The user explicitly commanded an action: "${q}".
Proceed with the requested tool execution. Guide the user through the workflow.`,

    [QuestionType.SUBMISSION_READINESS]: (r, q) => `
[ENOV-AIT CONSULTANT: SUBMISSION READINESS]
The user asked about submission readiness: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Requirement: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide an authoritative assessment of submission readiness.`,

    [QuestionType.NARRATIVE_ASSISTANCE]: (r, q) => `
[ENOV-AIT CONSULTANT: NARRATIVE ASSISTANCE]
The user requested narrative assistance: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Requirement: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide clear guidance for drafting the IGBC narrative.`,

    [QuestionType.CLARIFICATION_ASSISTANCE]: (r, q) => `
[ENOV-AIT CONSULTANT: CLARIFICATION ASSISTANCE]
The user asked for clarification assistance: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Requirement: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide clear consultant rationale and clarification.`,

    [QuestionType.CONTRIBUTOR_COPILOT]: (r, q) => `
[ENOV-AIT CONSULTANT: CONTRIBUTOR COPILOT]
The user asked for contributor guidance: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Requirement: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide actionable contributor-level guidance.`,

    [QuestionType.KNOWLEDGE_QUERY]: (r, q) => `
[ENOV-AIT CONSULTANT: KNOWLEDGE INQUIRY]
The user queried the IGBC credit knowledgebase: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Requirement: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
INSTRUCTIONS: You are an expert IGBC Consultant. Use the deterministic reasoning data provided above to inform your response. If the data says "not found" or "no documents mapped", politely and naturally explain this to the user without making up missing facts. Keep your tone empathetic and conversational.`
  };

  public static validatePlannerCoverage(): void {
    const missingTypes: string[] = [];
    for (const type of Object.values(QuestionType)) {
      if (!this.templates[type as QuestionType]) {
        missingTypes.push(type);
      }
    }
    if (missingTypes.length > 0) {
      throw new Error(`Planner Coverage Defect: Missing templates for QuestionTypes: ${missingTypes.join(", ")}`);
    }
  }

  public static validateConsultantResponse(reasoning: Partial<ReasoningOutput>): ReasoningOutput {
    return {
      consultantAssessment: reasoning.consultantAssessment?.trim() || "Direct answer unavailable from current data.",
      evidence: reasoning.evidence?.trim() || "Evidence section unavailable from current data.",
      igbcInterpretation: reasoning.igbcInterpretation?.trim() || "Interpretation unavailable from current data.",
      risks: reasoning.risks?.trim() || "Risk section unavailable from current data.",
      recommendations: reasoning.recommendations?.trim() || "Recommendation section unavailable from current data.",
    };
  }

  public static generatePrompt(
    questionType: QuestionType,
    query: string,
    rawReasoning: ReasoningOutput | null,
    tracer?: PipelineTracer
  ): string {
    let finalPrompt = "";
    
    if (!rawReasoning && questionType !== QuestionType.ACTION_REQUEST) {
      finalPrompt = `
[REASONING PIPELINE FAILED]
Provide a standard consultant response using available context. Do not execute any tools.
`;
    } else {
      const reasoning = rawReasoning ? this.validateConsultantResponse(rawReasoning) : this.validateConsultantResponse({});
      
      if (
        questionType === QuestionType.EXECUTIVE_PRIORITY || 
        questionType === QuestionType.WORKLOAD || 
        questionType === QuestionType.CERTIFICATION_GAP
      ) {
         const brief = generateExecutiveBrief(reasoning, questionType);
         finalPrompt = ExecutiveBriefTemplates.formatBrief(brief, query);
      } else {
        const templateFn = this.templates[questionType];
        if (!templateFn) {
          throw new Error(`Missing template for ${questionType}`);
        }
        finalPrompt = templateFn(reasoning, query);
      }
    }

    if (tracer) {
      ResponseAudit.audit(query, "ConsultantResponsePlannerV2", finalPrompt, tracer);
    }
    
    return finalPrompt;
  }
}

// Startup check execution
ConsultantResponsePlannerV2.validatePlannerCoverage();
