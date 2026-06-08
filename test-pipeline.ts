import { ReasoningEngine } from "./packages/harita-engine/reasoning/reasoning-engine";
import { ConsultantResponsePlannerV2 } from "./packages/harita-engine/consultant-response-planner-v2";

async function main() {
  const query = "What is preventing EDA C1 from being submitted today?";
  const projectId = "project-123";
  const userRole = "project_admin";
  
  console.log("=== 1. QUESTION CLASSIFIER & REASONING ===");
  const reasoning = await ReasoningEngine.processQuery(query, userRole, projectId);
  console.log(JSON.stringify(reasoning, null, 2));

  console.log("\n=== 2. PLANNER ===");
  const finalPrompt = ConsultantResponsePlannerV2.validateConsultantResponse(reasoning);
  console.log(finalPrompt.igbcInterpretation || finalPrompt.consultantAssessment);
}

main().catch(console.error);
