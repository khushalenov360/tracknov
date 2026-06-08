import { ExecutiveBrief } from "../types/executiveBrief";

export class ExecutiveBriefTemplates {
  public static formatBrief(brief: ExecutiveBrief, context: string): string {
    return `
[EXECUTIVE BRIEF]
Context: ${context}

Executive Summary
${brief.summary}

Critical Action
${brief.primaryAction.title}

Why This Matters
${brief.businessImpact.join("\n")}

Expected Impact
${brief.recommendations.map(r => "- " + r).join("\n")}

Owner
${brief.primaryAction.owner || "Unassigned"}

Target Date
${brief.primaryAction.dueDate || "Immediate"}

Recommended Next Action
${brief.recommendations[0] || "Proceed with primary action"}

Confidence
${brief.confidence}%

Risks
${brief.risks.map(r => "- " + r).join("\n")}
    `.trim();
  }
}
