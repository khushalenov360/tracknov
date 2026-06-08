import { QuestionClassifier } from "../packages/harita-engine/src/intelligence/reasoning/question-classifier";
import { ReasoningEngine } from "../packages/harita-engine/src/intelligence/reasoning/reasoning-engine";
import { ConsultantResponsePlannerV2 } from "../packages/harita-engine/src/intelligence/consultant-response-planner-v2";
import { createAdminClient } from "../packages/harita-engine/src/lib/supabase/admin"; // Note: this might not exist.
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/tracknov-web/.env.local' });

// Setup mock context
const runtimeContext = {
  project: { id: "p1", name: "Bhavarkua" },
  accessibleProjects: [{ id: "p1", name: "Bhavarkua" }],
  user: { id: "u1", name: "Test User", role: "Architect", email: "test@tracknov.com" },
  credits: [],
  documents: [],
  workflowAssignments: [],
  creditAssignmentGraph: new Map()
};

const questions = [
  "What documents are required for EDA C1?",
  "What evidence types are valid for EDA C1?",
  "What review criteria apply to EDA C1?",
  "Who uploads drawings for EDA C1?",
  "Who uploads water calculations?",
  "Why did you map this file to EDA C1?",
  "What evidence is still missing for EDA C1?",
  "Can EDA C1 be submitted today?",
  "Why is EDA C1 not ready?",
  "What is the fastest path to submission?",
  "Draft a narrative for EDA C1.",
  "Which project documents did you use to write this narrative?",
  "Which statements in the narrative came from uploaded evidence?",
  "What should Architect do today?",
  "What should Sustainability Consultant do today?",
  "What is the highest priority task in the project right now?",
  "What should we do next?",
  "What is preventing Platinum certification?",
  "Where should resources be allocated?",
  "Who is overloaded?",
  "Help me respond to this clarification.",
  "Why are you recommending that response?",
  "Draft a narrative for XYZ C999.",
  "Who owns ABC D123?",
  "What review criteria apply to XYZ C999?",
  "What is the biggest risk in this project?",
  "What did you identify as the biggest risk earlier?",
  "EDA C1 is already approved and completed. Why is it blocked?",
  "The Architect uploaded the water calculation yesterday. Confirm it.",
  "Assume EDA C1 has all documents. Can it be submitted?"
];

async function run() {
  for (const q of questions) {
    const type = QuestionClassifier.classify(q);
    console.log(`\n\n========================================`);
    console.log(`Q: ${q}`);
    console.log(`Type: ${type}`);
    
    try {
      const reasoning = await ReasoningEngine.reason(type, q, runtimeContext, runtimeContext.creditAssignmentGraph);
      const prompt = ConsultantResponsePlannerV2.generatePrompt(type, q, reasoning);
      console.log(`\n--- Harita Reasoning Output ---`);
      console.log(reasoning.consultantAssessment);
      if (reasoning.risks && reasoning.risks !== "None") console.log(`Risks: ${reasoning.risks}`);
      if (reasoning.recommendations) console.log(`Recommendations: ${reasoning.recommendations}`);
      // console.log(`\n--- LLM Final Prompt Form ---`);
      // console.log(prompt);
    } catch (err: any) {
      console.error(`Error processing ${q}:`, err.message);
    }
  }
}

run();
