import { ReasoningEngine } from "../packages/harita-engine/src/intelligence/reasoning/reasoning-engine";
import { QuestionClassifier } from "../packages/harita-engine/src/intelligence/reasoning/question-classifier";
import { ConsultantResponsePlannerV2 } from "../packages/harita-engine/src/intelligence/consultant-response-planner-v2";
import { PipelineTracer } from "../packages/harita-engine/src/intelligence/debug/pipeline-tracer";
import * as fs from 'fs';

const mockRuntimeContext = {
  project: { id: "p1", name: "Green HQ" },
  credits: [{ id: "c1", credit_code: "EDA C1", status: "INCOMPLETE", completion_pct: 20 }],
  documents: [{ id: "d1", file_name: "drawing.pdf", doc_category: "EDA C1", state: "REJECTED" }],
  profiles: {
    "u1": { full_name: "Architect", role: "architect" },
    "u2": { full_name: "Contractor", role: "contractor" },
    "u3": { full_name: "Project Manager", role: "pm" }
  },
  creditAssignmentGraph: new Map([
    ["c1", {
      assignments: [
        { doc_type: "Drawings", assigned_to: "u1" },
        { doc_type: "Calculations", assigned_to: "u1" }
      ]
    }]
  ])
};

const mockGraphContext = {};

const questions = {
  A: [
    "Who owns EDA C1?",
    "Who owns the Drawing requirement for EDA C1?",
    "Who owns the Calculation & Tables requirement for EDA C1?",
    "Why is the Architect assigned Drawings for EDA C1?",
    "Why is the Architect assigned Calculations for EDA C1?",
    "Which contributors are assigned to EDA C1?",
    "Which requirements currently have no contributor assigned?",
    "Which credits have unassigned deliverables?",
    "Which contributor has the highest workload?",
    "Which contributor has the lowest workload?",
    "What credits are currently assigned to the Architect?",
    "What credits are currently assigned to the Contractor?",
    "What credits are currently assigned to the Project Manager?",
    "Which assignments are overdue?",
    "What assignment changes would reduce project risk?"
  ],
  B: [
    "What evidence is missing for EDA C1?",
    "Which documents are incomplete?",
    "Which documents have been rejected?",
    "Which credits have rejected evidence?",
    "What documents must be uploaded before EDA C1 can be reviewed?",
    "Which credits are missing calculations?",
    "Which credits are missing drawings?",
    "Which credits are missing narratives?",
    "Which uploaded documents are not mapped to any credit?",
    "Which uploaded documents have the weakest evidence value?",
    "What evidence is preventing submission?",
    "Which documents require resubmission?",
    "Which credits have complete evidence packages?",
    "Which evidence gaps pose the highest risk?",
    "What evidence should be prioritized next?"
  ],
  C: [
    "What is preventing EDA C1 from being submitted today?",
    "What are the top risks in EDA C1?",
    "Which credits are currently blocked?",
    "Why is EDA C1 blocked?",
    "Which blockers have the greatest certification impact?",
    "Which risks require immediate attention?",
    "Which credits are most likely to fail review?",
    "Which credits are least likely to achieve compliance?",
    "Which rejected documents create the highest risk?",
    "What risks are caused by missing assignments?",
    "What risks are caused by missing evidence?",
    "Which risks threaten Gold certification?",
    "Which risks threaten Platinum certification?",
    "What is the single biggest project risk?",
    "How can the current project risks be mitigated?"
  ],
  D: [
    "What is the readiness score of EDA C1?",
    "Why is EDA C1 only 20% complete?",
    "Which credits are submission-ready?",
    "Which credits are review-ready?",
    "Which credits are farthest from completion?",
    "Which credits could become ready this week?",
    "What prevents EDA C1 from becoming review-ready?",
    "What prevents EDA C1 from becoming submission-ready?",
    "Which credits require the least effort to complete?",
    "Which credits require the most effort to complete?",
    "What is the overall project readiness?",
    "What is delaying project completion?",
    "How much progress was made this month?",
    "Which credits improved readiness recently?",
    "Which credits lost readiness recently?"
  ],
  E: [
    "What certification level are we currently projected to achieve?",
    "What is preventing Gold certification?",
    "What is preventing Platinum certification?",
    "How many points are currently secured?",
    "How many points remain at risk?",
    "Which credits contribute most to Gold certification?",
    "Which credits contribute most to Platinum certification?",
    "What certification points are easiest to secure next?",
    "Which certification points are most likely to be lost?",
    "What is the shortest path to Gold certification?"
  ],
  F: [
    "What should we do next?",
    "Which action would improve EDA C1 readiness the most?",
    "Which action would reduce project risk the most?",
    "Which action would improve certification readiness the most?",
    "What should the Architect do next?",
    "What should the Project Manager do next?",
    "What should the Contractor do next?",
    "What is the highest-priority task in the project?",
    "What are the top 5 actions we should take this week?",
    "Which blocked credit should we resolve first?",
    "Where should resources be allocated?",
    "Which contributor needs support?",
    "Which task provides the highest certification impact?",
    "If we only have 30 minutes, what should we do?",
    "What is the recommended action plan for the next 7 days?"
  ]
};

async function runBenchmark() {
  let outputMarkdown = "# Harita 85-Question Benchmark Results\\n\\n";
  const sections = {
    A: "SECTION A — Assignment Intelligence",
    B: "SECTION B — Evidence Intelligence",
    C: "SECTION C — Blocker & Risk Intelligence",
    D: "SECTION D — Readiness Intelligence",
    E: "SECTION E — Certification Intelligence",
    F: "SECTION F — Recommendation Intelligence"
  };

  for (const [sectionKey, qs] of Object.entries(questions)) {
    outputMarkdown += `## ${sections[sectionKey as keyof typeof sections]}\\n\\n`;
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const qNumber = `${sectionKey}${String(i + 1).padStart(2, '0')}`;
      
      const tracer = new PipelineTracer();
      const qType = QuestionClassifier.classify(q);
      const reasoningOutput = await ReasoningEngine.reason(qType, q, mockRuntimeContext, mockGraphContext, tracer);
      const finalPrompt = ConsultantResponsePlannerV2.generatePrompt(qType, q, reasoningOutput, tracer);
      
      // Extract the Answer block cleanly from the prompt
      // Let's just output the whole generated prompt text, or format it nicely.
      const lines = finalPrompt.split('\\n');
      const answerStart = lines.findIndex(l => l.startsWith('Answer: '));
      let simplifiedAnswer = finalPrompt.trim();
      
      outputMarkdown += `### Q: ${qNumber}\\n**${q}**\\n\\n`;
      outputMarkdown += `**Classifier:** ${qType}\\n\\n`;
      outputMarkdown += `**A:**\\n\`\`\`\\n${simplifiedAnswer}\\n\`\`\`\\n\\n`;
    }
  }

  fs.writeFileSync("harita_85_benchmark_results.md", outputMarkdown);
  console.log("Benchmark written to harita_85_benchmark_results.md");
}

runBenchmark().catch(console.error);
