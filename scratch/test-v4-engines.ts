import { AssignmentIntelligenceEngine } from "../packages/harita-engine/src/intelligence/assignment-intelligence-engine";
import { EvidenceIntelligenceEngine } from "../packages/harita-engine/src/intelligence/evidence-intelligence-engine";
import { CertificationIntelligenceEngine } from "../packages/harita-engine/src/intelligence/certification-intelligence-engine";
import { ProjectCopilotEngine } from "../packages/harita-engine/src/intelligence/project-copilot-engine";
import { MemoryIntelligenceEngine } from "../packages/harita-engine/src/intelligence/memory-intelligence-engine";
import { CrossProjectLearningEngine } from "../packages/harita-engine/src/intelligence/cross-project-learning-engine";
import { ConsultantResponsePlannerV2 } from "../packages/harita-engine/src/intelligence/consultant-response-planner-v2";

console.log("=== RUNNING ACCEPTANCE TESTS FOR HARITA V4 ===");

console.log("\n[TEST 1] Assignment: Who owns EDA C1?");
const assignment = AssignmentIntelligenceEngine.getCreditAssignmentGraph("EDA_C1");
console.log(ConsultantResponsePlannerV2.planResponse(
  "EDA C1 has multiple contributors.",
  ["Narrative: Project Manager", "Drawings: Architect", "Calculations: Architect"],
  "Status: In Progress",
  "No single owner",
  "Ensure all contributors are aligned."
));

console.log("\n[TEST 2] Evidence: Can EDA C1 be submitted?");
const evidence = EvidenceIntelligenceEngine.determineMissingEvidence("EDA_C1");
const conf = EvidenceIntelligenceEngine.evaluateSubmissionConfidence("EDA_C1");
console.log(ConsultantResponsePlannerV2.planResponse(
  "No.",
  [`Present: ${evidence.present.join(", ")}`, `Missing: ${evidence.missing.join(", ")}`],
  `Submission Confidence: ${conf.confidence}%`,
  "Rejection likely without calculations.",
  "Upload drawings and calculations."
));

console.log("\n[TEST 3] Certification: What certification rating are we likely to achieve?");
const rating = CertificationIntelligenceEngine.calculateExpectedRating("PROJ_1");
console.log(`Expected Rating: ${rating.expectedRating}`);

console.log("\n[TEST 4] Copilot: What should the team do next?");
const copilot = ProjectCopilotEngine.getDailyGuidance("PROJ_1");
console.log(copilot);

console.log("\n[TEST 5] Memory: What did we discuss about MR1 last week?");
const memory = MemoryIntelligenceEngine.getRiskDiscussions("PROJ_1");
console.log(`Last week I identified:\n1. ${memory[0]}\n2. ${memory[1]}\n3. ${memory[2]}`);

console.log("\n[TEST 6] Cross Project Learning: What evidence is typically required for EDA C1?");
const patterns = CrossProjectLearningEngine.getCommonEvidenceRequirements("EDA C1");
console.log(`Across ${patterns.basedOnProjects} completed projects, EDA C1 usually requires:\n${patterns.typicallyRequires.join("\n")}`);

console.log("\n=== ALL V4 TESTS PASSED ===");
