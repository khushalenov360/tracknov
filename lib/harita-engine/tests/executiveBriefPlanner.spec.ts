import { generateExecutiveBrief } from "../ai/planners/executiveBriefPlanner";

async function runTest() {
  const mockReasoning = {
    evidence: JSON.stringify([{
      title: "Resubmit EDA C1 rejected evidence",
      owner: "Architect",
      urgency: 100,
      rationale: "This rejection is currently blocking certification progress and preventing stage advancement."
    }])
  };

  const brief = generateExecutiveBrief(mockReasoning, "EXECUTIVE_PRIORITY");
  
  if (!brief.primaryAction.title.includes("Resubmit")) throw new Error("Missing action");
  if (brief.primaryAction.owner !== "Architect") throw new Error("Missing owner");
  if (brief.businessImpact.length === 0) throw new Error("Missing impact");
  if (brief.recommendations.length === 0) throw new Error("Missing recommendation");

  console.log("executiveBriefPlanner.spec.ts: PASS");
}

runTest().catch(console.error);
