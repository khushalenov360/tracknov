import { ExecutiveBrief } from "../types/executiveBrief";

export function generateExecutiveBrief(reasoningResult: any, queryType: string): ExecutiveBrief {
  if (queryType === "EXECUTIVE_PRIORITY") {
    let topAction: any = null;
    let actions: any[] = [];
    try {
      actions = JSON.parse(reasoningResult.evidence);
      if (actions.length > 0) {
        topAction = actions[0];
      }
    } catch (e) {}

    return {
      summary: reasoningResult.consultantAssessment || "Critical project actions require immediate attention to maintain certification timeline.",
      primaryAction: {
        title: topAction?.title || reasoningResult.recommendations || "No critical actions pending",
        owner: topAction?.owner || "Project Team",
        dueDate: "Immediate focus",
        priority: topAction?.impactScore > 80 ? "critical" : "high"
      },
      businessImpact: [
        topAction?.rationale || reasoningResult.igbcInterpretation || "Action impacts overall certification timeline."
      ],
      risks: reasoningResult.risks ? reasoningResult.risks.split(";").filter(Boolean) : [],
      recommendations: [
        "Review missing evidence and upload required documents."
      ],
      confidence: topAction?.impactScore || 95,
      evidence: actions
    };
  }

  if (queryType === "CERTIFICATION_GAP") {
    let gap: any = {};
    try {
      gap = JSON.parse(reasoningResult.evidence);
    } catch (e) {}

    return {
      summary: "Gold is already secured. However, points remain at risk.",
      primaryAction: {
        title: "Resolve rejected evidence immediately.",
        priority: "high"
      },
      businessImpact: [
        `If these risks materialize, ${gap.targetCertification || "Platinum"} becomes unattainable.`
      ],
      risks: [
        `${gap.riskPoints || 0} points remain at risk.`
      ],
      recommendations: [
        "Resolve rejected evidence immediately."
      ],
      confidence: 90,
      evidence: [gap]
    };
  }

  if (queryType === "WORKLOAD") {
    let workloads: any[] = [];
    let overloaded: any = null;
    try {
      workloads = JSON.parse(reasoningResult.evidence);
      if (workloads.length > 0) {
        overloaded = workloads[0];
      }
    } catch (e) {}

    return {
      summary: "Workload distribution is heavily skewed, threatening critical paths.",
      primaryAction: {
        title: "Reassign blocked items from highly loaded contributors.",
        priority: "medium"
      },
      businessImpact: [
        `${overloaded?.contributorName || "A contributor"} has a predicted overload (Capacity Utilization: ${overloaded?.capacityUtilization || 85}%).`
      ],
      risks: [
        "Bottleneck in evidence gathering."
      ],
      recommendations: [
        `Consider reassignment candidates: ${(overloaded?.reassignmentCandidates || ["Contractor"]).join(", ")}`
      ],
      confidence: 85,
      evidence: workloads
    };
  }

  // Default fallback brief
  return {
    summary: "Project state update.",
    primaryAction: {
      title: "Review project board.",
      priority: "medium"
    },
    businessImpact: ["Ensure alignment."],
    risks: ["Unknown"],
    recommendations: ["Review dashboard."],
    confidence: 50,
    evidence: []
  };
}
