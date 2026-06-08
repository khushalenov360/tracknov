import { QuestionClassifier, QuestionType } from "../packages/harita-engine/src/intelligence/reasoning/question-classifier";
import { ReasoningEngine } from "../packages/harita-engine/src/intelligence/reasoning/reasoning-engine";
import { ConsultantResponsePlannerV2 } from "../packages/harita-engine/src/intelligence/consultant-response-planner-v2";

async function test() {
  const query = "What should we do next?";
  const qType = QuestionClassifier.classify(query);
  console.log("QTYPE:", qType);
  
  const ctx = { project: { id: "p1" }, documents: [], credits: [] };
  const reasoning = await ReasoningEngine.reason(qType, query, ctx as any, null as any);
  console.log("REASONING:", JSON.stringify(reasoning, null, 2));
  
  const prompt = ConsultantResponsePlannerV2.generatePrompt(qType, query, reasoning);
  console.log("PROMPT:");
  console.log(prompt);
}
test().catch(console.error);
