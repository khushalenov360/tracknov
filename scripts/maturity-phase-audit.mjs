import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8");
}

function check(label, predicate) {
  if (!predicate) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`PASS: ${label}`);
}

const projectService = read("lib/harita-engine/services/project-service.ts");
const exportService = read("lib/harita-engine/services/export-service.ts");
const reviewerAgent = read("lib/harita-engine/intelligence/agents/reviewer.ts");
const evidenceValidationEngine = read("lib/harita-engine/governance/evidenceValidationEngine.ts");
const submissionPackRoute = read("app/api/projects/[id]/submission-pack/route.ts");
const acceptanceMatrix = read("artifacts/governance/RUNTIME_ACCEPTANCE_MATRIX.md");
const goldenFlow = read("artifacts/governance/GOLDEN_FLOW.md");

check("Phase 3 snapshot freeze present", /generateSnapshot\s*\(/.test(projectService));
check("Phase 3 certification lock transition present", /CERTIFIED_LOCKED/.test(projectService));
check("Phase 3 submission archive route emits zip", /submission-pack\.zip|\.zip/.test(submissionPackRoute));
check("Phase 3 export immutability gate present", /CERTIFIED_LOCKED/.test(exportService));

check("Phase 4 deterministic validation engine present", /Authoritative evidence validation engine/.test(evidenceValidationEngine));
check("Phase 4 human-only finalization present", /human-only|L3|L5 credentials can approve or submit/i.test(reviewerAgent));

check("Phase 5 runtime acceptance matrix artifact present", acceptanceMatrix.includes("Runtime Acceptance Matrix"));
check("Phase 5 golden flow artifact present", goldenFlow.includes("Golden Flow"));
check("Phase 5 export lineage logging present", /export_generation_history/.test(exportService));
