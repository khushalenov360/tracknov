export interface ExecutiveAction {
  id: string;
  title: string;
  impactScore: number;
  readinessGain: number;
  certificationImpact: number;
  riskReduction: number;
  urgency: number;
  rationale: string;
  owner?: string;
}

export class ExecutivePrioritizationEngine {
  public static async getTopActions(projectId: string, runtimeContext: any): Promise<ExecutiveAction[]> {
    const actions: ExecutiveAction[] = [];
    
    const credits = runtimeContext.credits || [];
    const documents = runtimeContext.documents || [];
    
    for (const credit of credits) {
      if (credit.status === "APPROVED" || credit.na) continue;
      
      const rejectedDocs = documents.filter((d: any) => d.doc_category === credit.credit_code && d.state === "REJECTED");
      if (rejectedDocs.length > 0) {
        const readinessGain = 80;
        const certificationImpact = 70;
        const riskReduction = 90;
        const urgency = 100;
        const impactScore = (readinessGain * 0.35) + (certificationImpact * 0.30) + (riskReduction * 0.20) + (urgency * 0.15);
        
        actions.push({
          id: `action-${credit.id}-rejected`,
          title: `Resubmit rejected documents for ${credit.credit_code}`,
          impactScore: Math.round(impactScore),
          readinessGain,
          certificationImpact,
          riskReduction,
          urgency,
          rationale: "Rejected evidence strictly prevents submission until deficiencies are corrected."
        });
      }
      
      if (credit.completion_pct < 50) {
        const readinessGain = 60;
        const certificationImpact = 50;
        const riskReduction = 40;
        const urgency = 60;
        const impactScore = (readinessGain * 0.35) + (certificationImpact * 0.30) + (riskReduction * 0.20) + (urgency * 0.15);
        actions.push({
          id: `action-${credit.id}-progress`,
          title: `Accelerate evidence gathering for ${credit.credit_code}`,
          impactScore: Math.round(impactScore),
          readinessGain,
          certificationImpact,
          riskReduction,
          urgency,
          rationale: "Credit is significantly behind schedule and needs immediate focus to prevent delays."
        });
      }
    }
    
    return actions.sort((a, b) => b.impactScore - a.impactScore);
  }
}
