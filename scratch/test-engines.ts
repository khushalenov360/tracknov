import { assembleRuntimeContext } from "../packages/harita-engine/src/lib/runtime/runtime-context-assembler";
import { ProjectIntelligenceEngine } from "../packages/harita-engine/src/engines/project-intelligence-engine";
import { CreditIntelligenceEngine } from "../packages/harita-engine/src/engines/credit-intelligence-engine";
import { ReviewIntelligenceEngine } from "../packages/harita-engine/src/engines/review-intelligence-engine";
import { getToolRegistry } from "../packages/harita-engine/src/lib/runtime/tool-registry";
import { StatePersistence } from "../packages/harita-engine/src/lib/runtime/state-persistence";

async function runMockEngineTests() {
  console.log("Starting Harita V3 Engine Test...");
  const ctx = await assembleRuntimeContext();
  if (!ctx) {
    console.error("Authentication failed or no project context.");
    return;
  }
  
  console.log("--- 1. Testing Project Intelligence Engine ---");
  const health = ProjectIntelligenceEngine.analyzeProjectHealth(ctx);
  console.log("Project Health:", health);

  console.log("--- 2. Testing Credit Intelligence Engine ---");
  if (ctx.credits.length > 0) {
    const cHealth = CreditIntelligenceEngine.evaluateCredit(ctx.credits[0].id, ctx);
    console.log("First Credit Health:", cHealth);
  }

  console.log("--- 3. Testing Review Intelligence Engine ---");
  if (ctx.documents.length > 0) {
    const review = ReviewIntelligenceEngine.simulateAssessorReview(ctx.documents[0].id, ctx);
    console.log("Review Output:", review);
  }

  console.log("--- 4. Testing Tool Registry ---");
  const tools = getToolRegistry();
  console.log(`Registered Tools: ${tools.map(t => t.name).join(", ")}`);

  console.log("--- 5. Testing State Persistence ---");
  if (ctx.project) {
    const sessionId = "test-session-123";
    await StatePersistence.saveAgentState(ctx.project.id, sessionId, { mock: "state" });
    const loaded = await StatePersistence.loadAgentState(ctx.project.id, sessionId);
    console.log("State Persistence Success:", loaded.mock === "state");
  } else {
    console.log("Skipping State Persistence (No focused project in runtime context)");
  }
}

runMockEngineTests().catch(console.error);
