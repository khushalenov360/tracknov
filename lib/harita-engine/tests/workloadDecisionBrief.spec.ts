import { WorkloadIntelligenceEngine } from "../intelligence/workload/workload-intelligence-engine";
import { generateExecutiveBrief } from "../ai/planners/executiveBriefPlanner";

import { describe, it, expect } from 'vitest';

describe('Workload Decision Brief Planner', () => {
  it('should generate a workload priority brief', async () => {
    const mockContext = {
      credits: [
        { id: "c1", status: "BLOCKED" },
        { id: "c2", status: "BLOCKED" }
      ],
      profiles: {
        "user1": { full_name: "Architect" },
        "user2": { full_name: "Contractor" }
      },
      creditAssignmentGraph: new Map([
        ["c1", { assignments: [{ assigned_to: "user1" }, { assigned_to: "user1" }] }],
        ["c2", { assignments: [{ assigned_to: "user1" }] }]
      ])
    };

    const workloads = await WorkloadIntelligenceEngine.getContributorWorkloads("p1", mockContext);
    
    const mockReasoning = {
      evidence: JSON.stringify(workloads)
    };

    const brief = generateExecutiveBrief(mockReasoning, "WORKLOAD");

    expect(brief.businessImpact[0]).toContain("predicted overload");
    expect(brief.recommendations[0]).toContain("Contractor");
  });
});
