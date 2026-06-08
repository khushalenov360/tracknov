import { QuestionClassifier, QuestionType } from "../../../packages/harita-engine/src/intelligence/reasoning/question-classifier";
import { ReasoningEngine } from "../../../packages/harita-engine/src/intelligence/reasoning/reasoning-engine";
import { ConsultantResponsePlannerV2 } from "../../../packages/harita-engine/src/intelligence/consultant-response-planner-v2";
import { PipelineTracer } from "../../../packages/harita-engine/src/intelligence/debug/pipeline-tracer";

const queries = [
  "What should we do next?",
  "Who is overloaded?",
  "What is preventing Gold certification?",
  "Which task has highest impact?"
];

async function generateOutputs() {
  const mockContext = {
    project: { id: "p1", name: "Test Project" },
    credits: [
      { id: "c1", credit_code: "EDA C1", status: "BLOCKED", completion_pct: 30, points: 2 },
      { id: "c2", credit_code: "MR C2", status: "APPROVED", completion_pct: 100, points: 5 },
      { id: "c3", credit_code: "WE C1", status: "PENDING", completion_pct: 10, points: 4 }
    ],
    documents: [
      { id: "d1", doc_category: "EDA C1", state: "REJECTED", file_name: "floor_plan.pdf" },
      { id: "d2", doc_category: "EDA C1", state: "MISSING", file_name: "calculations.pdf" }
    ],
    profiles: {
      "user1": { full_name: "Architect", role: "Architect" },
      "user2": { full_name: "Contractor", role: "Contractor" },
      "user3": { full_name: "Sustainability Consultant", role: "Consultant" }
    },
    creditAssignmentGraph: new Map([
      ["c1", { assignments: [
          { assigned_to: "user1", doc_type: "Drawings" },
          { assigned_to: "user1", doc_type: "Calculations" }
      ] }],
      ["c3", { assignments: [
          { assigned_to: "user2", doc_type: "Water Specs" }
      ] }]
    ])
  };

  let mdOutput = "# Runtime Outputs for Project Intelligence Queries\n\n";

  for (const q of queries) {
    mdOutput += `## Query: "${q}"\n\n`;

    const tracer = new PipelineTracer();
    const qt = QuestionClassifier.classify(q);
    
    // Reasoning
    const result = await ReasoningEngine.reason(qt, q, mockContext, {}, tracer);
    
    // Planner
    const prompt = ConsultantResponsePlannerV2.generatePrompt(qt, q, result, tracer);

    // Pipeline Trace
    mdOutput += "### 1. Pipeline Trace\n```\n";
    mdOutput += tracer.getTraces().map(t => `[${t.stage}] - ${t.output}`).join("\n");
    mdOutput += "\n```\n\n";

    // Reasoning Output
    mdOutput += "### 2. Reasoning Output\n```json\n";
    mdOutput += JSON.stringify(result, null, 2);
    mdOutput += "\n```\n\n";

    // Final Consultant Response (Prompt to LLM)
    mdOutput += "### 3. Final Consultant Response (Prompt to LLM)\n```\n";
    mdOutput += prompt;
    mdOutput += "\n```\n\n";
    mdOutput += "---\n\n";
  }

  const fs = require('fs');
  fs.writeFileSync('C:/Users/91922/Documents/Codex/tracknov/scratch/testing/project-intelligence/runtime_outputs.md', mdOutput);
  console.log("Outputs generated to scratch/testing/project-intelligence/runtime_outputs.md");
}

generateOutputs().catch(console.error);
