"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultantResponsePlannerV2 = void 0;
const question_classifier_1 = require("./reasoning/question-classifier");
const response_audit_1 = require("./debug/response-audit");
const executiveBriefPlanner_1 = require("../ai/planners/executiveBriefPlanner");
const executiveBriefTemplates_1 = require("../ai/templates/executiveBriefTemplates");
class ConsultantResponsePlannerV2 {
    static validatePlannerCoverage() {
        const missingTypes = [];
        for (const type of Object.values(question_classifier_1.QuestionType)) {
            if (!this.templates[type]) {
                missingTypes.push(type);
            }
        }
        if (missingTypes.length > 0) {
            throw new Error(`Planner Coverage Defect: Missing templates for QuestionTypes: ${missingTypes.join(", ")}`);
        }
    }
    static validateConsultantResponse(reasoning) {
        var _a, _b, _c, _d, _e;
        return {
            consultantAssessment: ((_a = reasoning.consultantAssessment) === null || _a === void 0 ? void 0 : _a.trim()) || "Direct answer unavailable from current data.",
            evidence: ((_b = reasoning.evidence) === null || _b === void 0 ? void 0 : _b.trim()) || "Evidence section unavailable from current data.",
            igbcInterpretation: ((_c = reasoning.igbcInterpretation) === null || _c === void 0 ? void 0 : _c.trim()) || "Interpretation unavailable from current data.",
            risks: ((_d = reasoning.risks) === null || _d === void 0 ? void 0 : _d.trim()) || "Risk section unavailable from current data.",
            recommendations: ((_e = reasoning.recommendations) === null || _e === void 0 ? void 0 : _e.trim()) || "Recommendation section unavailable from current data.",
        };
    }
    static generatePrompt(questionType, query, rawReasoning, tracer) {
        let finalPrompt = "";
        if (!rawReasoning && questionType !== question_classifier_1.QuestionType.ACTION_REQUEST) {
            finalPrompt = `
[REASONING PIPELINE FAILED]
Provide a standard consultant response using available context. Do not execute any tools.
`;
        }
        else {
            const reasoning = rawReasoning ? this.validateConsultantResponse(rawReasoning) : this.validateConsultantResponse({});
            if (questionType === question_classifier_1.QuestionType.EXECUTIVE_PRIORITY ||
                questionType === question_classifier_1.QuestionType.WORKLOAD ||
                questionType === question_classifier_1.QuestionType.CERTIFICATION_GAP) {
                const brief = (0, executiveBriefPlanner_1.generateExecutiveBrief)(reasoning, questionType);
                finalPrompt = executiveBriefTemplates_1.ExecutiveBriefTemplates.formatBrief(brief, query);
            }
            else {
                const templateFn = this.templates[questionType];
                if (!templateFn) {
                    throw new Error(`Missing template for ${questionType}`);
                }
                finalPrompt = templateFn(reasoning, query);
            }
        }
        if (tracer) {
            response_audit_1.ResponseAudit.audit(query, "ConsultantResponsePlannerV2", finalPrompt, tracer);
        }
        return finalPrompt;
    }
}
exports.ConsultantResponsePlannerV2 = ConsultantResponsePlannerV2;
ConsultantResponsePlannerV2.templates = {
    [question_classifier_1.QuestionType.BLOCKER]: (r, q) => `
[ENOV-AIT CONSULTANT: BLOCKER RESOLUTION]
The user encountered a blocker: "${q}".
Provide a direct consultant assessment.
${r.consultantAssessment}
Evidence: ${r.evidence}
Implication: ${r.igbcInterpretation}
Risk: ${r.risks}
Resolution Plan: ${r.recommendations}
Do NOT use markdown headers. Blend this into a fluent, authoritative explanation of how to unblock this.`,
    [question_classifier_1.QuestionType.RISK]: (r, q) => `
[ENOV-AIT CONSULTANT: RISK ASSESSMENT]
The user asked about risks: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Critical Risks: ${r.risks}
Mitigation: ${r.recommendations}
Deliver a serious, executive summary of the risk and immediate mitigation steps.`,
    [question_classifier_1.QuestionType.STATUS]: (r, q) => `
[ENOV-AIT CONSULTANT: READINESS/STATUS REPORT]
The user asked for status/readiness: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Requirement: ${r.igbcInterpretation}
Risks: ${r.risks}
Next Steps: ${r.recommendations}
Present this as a formal readiness update. Keep it concise.`,
    [question_classifier_1.QuestionType.STRATEGY]: (r, q) => `
[ENOV-AIT CONSULTANT: CERTIFICATION STRATEGY]
The user asked about strategy/certification: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Outline a clear, strategic path forward.`,
    [question_classifier_1.QuestionType.RECOMMENDATION]: (r, q) => `
[ENOV-AIT CONSULTANT: RECOMMENDATION]
The user asked for a recommendation: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Give a highly prescriptive, consultant-grade recommendation.`,
    [question_classifier_1.QuestionType.EXECUTIVE_PRIORITY]: (r, q) => `
[ENOV-AIT CONSULTANT: EXECUTIVE PRIORITY]
The user asked about executive priorities: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Top Actions: ${r.evidence}
Expected Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Deliver a highly prescriptive, executive-level summary of the top actions and their impact.`,
    [question_classifier_1.QuestionType.WORKLOAD]: (r, q) => `
[ENOV-AIT CONSULTANT: WORKLOAD INTELLIGENCE]
The user asked about contributor workload: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Contributor Workload: ${r.evidence}
Reason: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide a clear analysis of who is overloaded and why.`,
    [question_classifier_1.QuestionType.CERTIFICATION_GAP]: (r, q) => `
[ENOV-AIT CONSULTANT: CERTIFICATION GAP]
The user asked about certification progress: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Gap Analysis (Secured/Risk/Missing): ${r.evidence}
Current Position: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommended Credits: ${r.recommendations}
Explain the shortest path to the target certification clearly.`,
    [question_classifier_1.QuestionType.EVIDENCE_PORTFOLIO]: (r, q) => `
[ENOV-AIT CONSULTANT: PORTFOLIO EVIDENCE]
The user asked about missing or rejected evidence: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Missing and Rejected Evidence: ${r.evidence}
Readiness Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Next Actions: ${r.recommendations}
Summarize the critical document gaps threatening the portfolio.`,
    [question_classifier_1.QuestionType.PROJECT_STATUS]: (r, q) => `
[ENOV-AIT CONSULTANT: PROJECT STATUS]
The user asked about overall project status: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Summarize the current project standing.`,
    [question_classifier_1.QuestionType.PROJECT_RISK]: (r, q) => `
[ENOV-AIT CONSULTANT: PROJECT RISK]
The user asked about overall project risk: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Highlight the most critical risks affecting the project.`,
    [question_classifier_1.QuestionType.IMPACT_ANALYSIS]: (r, q) => `
[ENOV-AIT CONSULTANT: EXECUTIVE IMPACT ANALYSIS]
The user asked for an impact analysis: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide an executive-level impact briefing.`,
    [question_classifier_1.QuestionType.WHY]: (r, q) => `
[ENOV-AIT CONSULTANT: ASSIGNMENT / RATIONALE]
The user asked for assignment rationale: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Explain the reasoning behind this clearly and professionally.`,
    [question_classifier_1.QuestionType.WHO]: (r, q) => `
[ENOV-AIT CONSULTANT: ASSIGNMENT / RATIONALE]
The user asked about assignment: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Explain the assignment context clearly.`,
    [question_classifier_1.QuestionType.WHAT]: (r, q) => `
[ENOV-AIT CONSULTANT: GENERAL ADVISORY]
The user asked a general what question: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide clear, factual consultant guidance.`,
    [question_classifier_1.QuestionType.HOW]: (r, q) => `
[ENOV-AIT CONSULTANT: PROCESS ADVISORY]
The user asked how to proceed: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide step-by-step authoritative guidance.`,
    [question_classifier_1.QuestionType.TRADEOFF]: (r, q) => `
[ENOV-AIT CONSULTANT: TRADEOFF ANALYSIS]
The user asked for a tradeoff analysis: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Weigh the pros and cons logically.`,
    [question_classifier_1.QuestionType.GENERAL]: (r, q) => `
[ENOV-AIT CONSULTANT: GENERAL]
The user asked a general question: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Impact: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide standard consultant context.`,
    [question_classifier_1.QuestionType.ACTION_REQUEST]: (r, q) => `
[ACTION REQUEST WORKFLOW]
The user explicitly commanded an action: "${q}".
Proceed with the requested tool execution. Guide the user through the workflow.`,
    [question_classifier_1.QuestionType.SUBMISSION_READINESS]: (r, q) => `
[ENOV-AIT CONSULTANT: SUBMISSION READINESS]
The user asked about submission readiness: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Requirement: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide an authoritative assessment of submission readiness.`,
    [question_classifier_1.QuestionType.NARRATIVE_ASSISTANCE]: (r, q) => `
[ENOV-AIT CONSULTANT: NARRATIVE ASSISTANCE]
The user requested narrative assistance: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Requirement: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide clear guidance for drafting the IGBC narrative.`,
    [question_classifier_1.QuestionType.CLARIFICATION_ASSISTANCE]: (r, q) => `
[ENOV-AIT CONSULTANT: CLARIFICATION ASSISTANCE]
The user asked for clarification assistance: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Requirement: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide clear consultant rationale and clarification.`,
    [question_classifier_1.QuestionType.CONTRIBUTOR_COPILOT]: (r, q) => `
[ENOV-AIT CONSULTANT: CONTRIBUTOR COPILOT]
The user asked for contributor guidance: "${q}".
Consultant Guidance:
${r.consultantAssessment}
Evidence: ${r.evidence}
IGBC Requirement: ${r.igbcInterpretation}
Risks: ${r.risks}
Recommendation: ${r.recommendations}
Provide actionable contributor-level guidance.`,
    [question_classifier_1.QuestionType.KNOWLEDGE_QUERY]: (r, q) => `
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
// Startup check execution
ConsultantResponsePlannerV2.validatePlannerCoverage();
