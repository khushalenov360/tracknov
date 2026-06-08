import { QuestionClassifier } from "../../../packages/harita-engine/src/intelligence/reasoning/question-classifier";
import { ReasoningEngine } from "../../../packages/harita-engine/src/intelligence/reasoning/reasoning-engine";
import { ConsultantResponsePlannerV2 } from "../../../packages/harita-engine/src/intelligence/consultant-response-planner-v2";

const queries = [
  "What should we do next?",
  "Who is overloaded?",
  "What is preventing Platinum certification?",
  "Where should resources be allocated?"
];

async function runAudit() {
  const mockContext = {
    project: { id: "p1" },
    credits: [],
    documents: [],
    profiles: {},
    creditAssignmentGraph: new Map()
  };

  console.log("================================");
  console.log("EXECUTIVE BRIEF AUDIT TRACE");
  console.log("================================\n");

  for (const q of queries) {
    console.log(`[QUERY]: "${q}"`);
    const qt = QuestionClassifier.classify(q);
    
    try {
      const tracer = {
        logStage: (stage: string, q2: string, out: string) => {}
      };
      const result = await ReasoningEngine.reason(qt, q, mockContext, {}, tracer as any);
      const finalPrompt = ConsultantResponsePlannerV2.generatePrompt(qt, q, result, tracer as any);
      
      console.log(`[FINAL PLANNER OUTPUT]:\n${finalPrompt}`);

    } catch (e: any) {
      console.log(`  [ENGINE ERROR] -> ${e.message}`);
    }
    console.log("--------------------------------");
  }
}

runAudit().catch(console.error);
