export interface ContributorBrief {
  role: string;
  openTasks: number;
  blockedTasks: number;
  rejectedTasks: number;
  highestImpactTask: string;
  expectedGain: string;
}

export class ContributorPrioritizationEngine {
  static getBriefForRole(role: string, context: any): ContributorBrief {
    // In production, this would calculate actual workload, not base it on PDFs
    return {
      role: role,
      openTasks: 5,
      blockedTasks: 1,
      rejectedTasks: 0,
      highestImpactTask: "EDA C1 Calculation",
      expectedGain: "+30"
    };
  }
}
