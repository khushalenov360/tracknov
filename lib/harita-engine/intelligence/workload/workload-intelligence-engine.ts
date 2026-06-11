export interface ContributorWorkload {
  contributorId: string;
  contributorName: string;
  activeAssignments: number;
  overdueAssignments: number;
  blockedAssignments: number;
  workloadScore: number;
  capacityUtilization: number;
  predictedOverload: boolean;
  reassignmentCandidates: string[];
}

export class WorkloadIntelligenceEngine {
  public static async getContributorWorkloads(projectId: string, runtimeContext: any): Promise<ContributorWorkload[]> {
    const workloads = new Map<string, ContributorWorkload>();
    
    const profiles = runtimeContext.profiles || {};
    const creditMap = runtimeContext.creditAssignmentGraph instanceof Map 
      ? runtimeContext.creditAssignmentGraph 
      : new Map(Object.entries(runtimeContext.creditAssignmentGraph || {}));

    // Initialize workloads for all known profiles
    for (const [uid, p] of Object.entries(profiles)) {
      const profile = p as any;
      workloads.set(uid, {
        contributorId: uid,
        contributorName: profile.full_name || profile.role || uid,
        activeAssignments: 0,
        overdueAssignments: 0,
        blockedAssignments: 0,
        workloadScore: 0,
        capacityUtilization: 0,
        predictedOverload: false,
        reassignmentCandidates: []
      });
    }

    // Traverse assignments
    for (const [creditId, node] of creditMap.entries()) {
      const assignments = (node as any).assignments || [];
      const credit = (runtimeContext.credits || []).find((c: any) => c.id === creditId);
      if (credit && credit.na) continue;
      const isBlocked = credit && credit.status === "BLOCKED";
      
      for (const assignment of assignments) {
        const uid = assignment.assigned_to;
        if (!uid) continue;
        
        let wl = workloads.get(uid);
        if (!wl) {
           wl = {
             contributorId: uid,
             contributorName: uid,
             activeAssignments: 0,
             overdueAssignments: 0,
             blockedAssignments: 0,
             workloadScore: 0,
             capacityUtilization: 0,
             predictedOverload: false,
             reassignmentCandidates: []
           };
           workloads.set(uid, wl);
        }
        
        wl.activeAssignments++;
        if (isBlocked) {
          wl.blockedAssignments++;
        }
      }
    }

    const results = Array.from(workloads.values());
    for (const r of results) {
       r.workloadScore = r.activeAssignments + (r.overdueAssignments * 3) + (r.blockedAssignments * 2);
       // Simple predictive logic: capacity is roughly based on score > 5
       r.capacityUtilization = Math.min(100, Math.max(0, Math.round((r.workloadScore / 6) * 100)));
       r.predictedOverload = r.capacityUtilization >= 85;
       
       // Reassignment candidates: those with capacity utilization < 50%
       if (r.predictedOverload) {
          r.reassignmentCandidates = results
            .filter(c => c.contributorId !== r.contributorId && c.workloadScore < 3)
            .map(c => c.contributorName);
       }
    }
    
    // Sort highest workload to lowest
    return results.sort((a, b) => b.workloadScore - a.workloadScore);
  }
}
