import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const includeRoots = ["app", "lib", "React/tracknov-server/src"];
const skipSegments = new Set(["node_modules", ".next", "dist", "build", "scratch", "artifacts"]);

const ruleSet = [
  {
    name: "Direct project certification state mutation",
    pattern: /\.from\("projects"\)\.update\(\{[\s\S]{0,220}?certification_state\s*:/g,
    allow: [
      "lib/harita-engine/services/project-service.ts",
      "React/tracknov-server/src/lib/harita-engine/services/project-service.ts",
    ],
  },
  {
    name: "Direct project credit status mutation",
    pattern: /\.from\("project_credits"\)\.update\(\{[\s\S]{0,220}?(status|completion_pct|blocked_by)\s*:/g,
    allow: [],
  },
  {
    name: "Direct submittal state mutation",
    pattern: /\.from\("submittals"\)\.update\(\{[\s\S]{0,220}?state\s*:/g,
    allow: [],
  },
  {
    name: "Direct project document workflow mutation",
    pattern: /\.from\("project_document"\)\.update\(\{[\s\S]{0,220}?workflow_state\s*:/g,
    allow: [],
  },
];

const fileAssertions = [
  {
    file: "app/api/workflow/transition/route.ts",
    pattern: /idempotencyKey/,
    message: "Workflow transition route must accept and forward idempotency keys.",
  },
  {
    file: "lib/harita-engine/services/workflow-orchestrator-service.ts",
    pattern: /validateSubmittalGate/,
    message: "Workflow orchestrator must enforce submittal validation gates before gated transitions.",
  },
  {
    file: "lib/harita-engine/services/submittal-service.ts",
    pattern: /Mandatory document types are not approved/,
    message: "Submittal service must enforce mandatory document approval rules.",
  },
  {
    file: "lib/harita-engine/services/credit-service.ts",
    pattern: /idempotencyKey\?: string \| null/,
    message: "Credit assignment mutations must expose explicit idempotency.",
  },
  {
    file: "React/tracknov-server/src/lib/harita-engine/services/workflow-orchestrator-service.ts",
    pattern: /validateSubmittalGate/,
    message: "React server mirror must enforce the same submittal validation gate.",
  },
  {
    file: "React/tracknov-server/src/lib/harita-engine/services/submittal-service.ts",
    pattern: /Mandatory document types are not approved/,
    message: "React server mirror must enforce mandatory document approval rules.",
  },
  {
    file: "React/tracknov-server/src/lib/harita-engine/services/credit-service.ts",
    pattern: /idempotencyKey\?: string \| null/,
    message: "React server mirror credit assignment mutations must expose explicit idempotency.",
  },
];

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipSegments.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, acc);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue;
    acc.push(fullPath);
  }
  return acc;
}

function toRepoRelative(fullPath) {
  return path.relative(repoRoot, fullPath).replace(/\\/g, "/");
}

const files = includeRoots.flatMap((root) => walk(path.join(repoRoot, root)));
const violations = [];

for (const file of files) {
  const relativePath = toRepoRelative(file);
  const text = fs.readFileSync(file, "utf8");
  for (const rule of ruleSet) {
    if (rule.allow.includes(relativePath)) continue;
    if (rule.pattern.test(text)) {
      violations.push({ file: relativePath, rule: rule.name });
    }
    rule.pattern.lastIndex = 0;
  }
}

if (violations.length > 0) {
  console.error("Phase 1 derived-state audit failed.");
  for (const violation of violations) {
    console.error(`- ${violation.rule}: ${violation.file}`);
  }
  process.exit(1);
}

for (const assertion of fileAssertions) {
  const fullPath = path.join(repoRoot, assertion.file);
  const text = fs.readFileSync(fullPath, "utf8");
  if (!assertion.pattern.test(text)) {
    console.error("Phase 1 derived-state audit failed.");
    console.error(`- ${assertion.message}: ${assertion.file}`);
    process.exit(1);
  }
}

console.log("Phase 1 derived-state audit passed.");
