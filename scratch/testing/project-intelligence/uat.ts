import { QuestionClassifier, QuestionType } from "../../../packages/harita-engine/src/intelligence/reasoning/question-classifier";
import { ReasoningEngine } from "../../../packages/harita-engine/src/intelligence/reasoning/reasoning-engine";

const questions = [
  "Which credits are blocked?",
  "Which credits are missing evidence?",
  "Who is overloaded?",
  "What should we do next?",
  "What is preventing Gold certification?",
  "Where should resources be allocated?",
  "Which task has highest impact?",
  "What are the top 5 actions this week?"
];

async function runUAT() {
  const mockContext = {
    project: { id: "p1", name: "Test Project" },
    credits: [
      { id: "c1", credit_code: "EDA C1", status: "BLOCKED", completion_pct: 30 },
      { id: "c2", credit_code: "MR C2", status: "APPROVED", completion_pct: 100 }
    ],
    documents: [
      { id: "d1", doc_category: "EDA C1", state: "REJECTED", file_name: "floor_plan.pdf" }
    ],
    profiles: {
      "user1": { full_name: "Architect", role: "Architect" },
      "user2": { full_name: "Contractor", role: "Contractor" }
    },
    creditAssignmentGraph: new Map([
      ["c1", { assignments: [{ assigned_to: "user1", doc_type: "Drawings" }] }]
    ])
  };

  let allPassed = true;

  console.log("==========================================");
  console.log("PROJECT INTELLIGENCE UAT");
  console.log("==========================================");

  for (const q of questions) {
    const qt = QuestionClassifier.classify(q);
    const result = await ReasoningEngine.reason(qt, q, mockContext, {});

    const isGeneral = qt === QuestionType.GENERAL || result.consultantAssessment.includes("Please specify a credit");
    
    if (isGeneral) {
      console.log(`❌ FAIL | Q: "${q}" | Classified as: ${qt}`);
      console.log(`   Response: ${result.consultantAssessment}`);
      allPassed = false;
    } else {
      console.log(`✅ PASS | Q: "${q}" | Classified as: ${qt}`);
    }
  }

  console.log("==========================================");
  if (allPassed) {
    console.log("SUCCESS: All project intelligence queries routed successfully.");
    process.exit(0);
  } else {
    console.error("FAILED: One or more queries fell back to GENERAL.");
    process.exit(1);
  }
}

runUAT().catch(console.error);
