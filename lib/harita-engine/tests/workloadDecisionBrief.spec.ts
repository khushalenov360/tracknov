import { WorkloadIntelligenceEngine } from "../intelligence/workload/workload-intelligence-engine";
import { generateExecutiveBrief } from "../ai/planners/executiveBriefPlanner";

async function runTest() {
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

  if (!brief.businessImpact[0].includes("predicted overload")) throw new Error("Missing overload reason/impact");
  if (!brief.recommendations[0].includes("Contractor")) throw new Error("Missing reassignment recommendation");

  console.log("workloadDecisionBrief.spec.ts: PASS");
}

runTest().catch(console.error);
