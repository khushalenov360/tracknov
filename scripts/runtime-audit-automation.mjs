import fs from "fs";
import path from "path";

const root = process.cwd();
const apiDir = path.join(root, "app", "api");
const migrationsDir = path.join(root, "supabase", "migrations");
const outDir = path.join(root, "artifacts", "reports");
fs.mkdirSync(outDir, { recursive: true });

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const apiFiles = walk(apiDir).filter((f) => f.endsWith("route.ts"));
const apiRows = apiFiles.map((file) => {
  const text = fs.readFileSync(file, "utf8");
  return {
    file: path.relative(root, file).replaceAll("\\", "/"),
    auth: /getCurrentUser|getUser\(/.test(text),
    rbac: /can[A-Z][A-Za-z]+/.test(text) || /Forbidden/.test(text),
    rateLimit: /checkRateLimit\(/.test(text),
    audit: /logSystemActivity|workflow_logs|activity_logs|recordDocumentReviewEvent/.test(text),
  };
});

const apiReport = [
  "# API enforcement audit",
  "",
  "| Route | Auth | RBAC | Rate Limit | Audit |",
  "|---|---:|---:|---:|---:|",
  ...apiRows.map((r) => `| \`${r.file}\` | ${r.auth ? "Y" : "N"} | ${r.rbac ? "Y" : "N"} | ${r.rateLimit ? "Y" : "N"} | ${r.audit ? "Y" : "N"} |`),
  "",
].join("\n");
fs.writeFileSync(path.join(outDir, "api-enforcement-audit.md"), apiReport);

const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
const migrationText = migrationFiles
  .map((f) => fs.readFileSync(path.join(migrationsDir, f), "utf8"))
  .join("\n\n");

const dbChecks = [
  ["ENUM definitions", /create type/i.test(migrationText)],
  ["FK constraints", /references public\./i.test(migrationText)],
  ["Trigger protections", /create trigger/i.test(migrationText)],
  ["RLS policy mentions", /policy|enable row level security/i.test(migrationText)],
  ["Immutable logs", /append-only|immutable|prevent_update|prevent_delete/i.test(migrationText)],
  ["Transition protections", /workflow|transition/i.test(migrationText)],
];

const dbReport = [
  "# DB enforcement audit",
  "",
  "| Control | Status |",
  "|---|---:|",
  ...dbChecks.map(([name, ok]) => `| ${name} | ${ok ? "PASS" : "FAIL"} |`),
  "",
  `Scanned migrations: ${migrationFiles.length}`,
  "",
].join("\n");
fs.writeFileSync(path.join(outDir, "db-enforcement-audit.md"), dbReport);

const gateChecks = [
  ["Runtime desync schema present", migrationFiles.some((f) => f.includes("0055_runtime_audit_enforcement.sql"))],
  ["AI governance migration present", migrationFiles.some((f) => f.includes("0052_ai_auditor_governance.sql"))],
  ["Runtime orchestration hardening migration present", migrationFiles.some((f) => f.includes("0056_runtime_semantics_orchestration_hardening.sql"))],
  ["Workflow transition endpoint present", fs.existsSync(path.join(root, "app", "api", "workflow", "transition", "route.ts"))],
  ["Workflow transition rules table present", /create table if not exists public\.workflow_transition_rules/i.test(migrationText)],
  ["Certified lock guard present", /CERTIFIED_LOCKED/i.test(migrationText) && /guard_certified_project_mutation/i.test(migrationText)],
  ["Append-only trigger baseline present", /prevent_append_only_mutation/i.test(migrationText)],
  ["Runtime reconciliation endpoint present", fs.existsSync(path.join(root, "app", "api", "jobs", "runtime", "reconcile", "route.ts"))],
  ["Signed URL endpoint present", fs.existsSync(path.join(root, "app", "api", "documents", "[id]", "route.ts"))],
  ["Rate-limit utility present", fs.existsSync(path.join(root, "lib", "security", "rate-limit.ts"))],
];

const sourceFiles = [
  ...walk(path.join(root, "app")).filter((f) => /\.(ts|tsx)$/.test(f)),
  ...walk(path.join(root, "lib")).filter((f) => /\.(ts|tsx)$/.test(f)),
];

const manualDerivedStateFindings = sourceFiles.flatMap((file) => {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const text = fs.readFileSync(file, "utf8");
  const suspicious = [];
  if (/\.from\("projects"\)[\s\S]{0,500}\.update\(\{[\s\S]{0,300}(state|certification_state|status)/.test(text)) {
    suspicious.push("project derived-state update");
  }
  if (/\.from\("project_credits"\)[\s\S]{0,500}\.update\(\{[\s\S]{0,300}(state|status)/.test(text)) {
    suspicious.push("project_credit derived-state update");
  }
  if (/\.from\("credit_stages"\)[\s\S]{0,500}\.update\(\{[\s\S]{0,300}(state|status)/.test(text)) {
    suspicious.push("credit_stage derived-state update");
  }
  return suspicious.map((finding) => ({ file: relative, finding }));
});

const gatesReport = [
  "# Deployment gates checklist automation",
  "",
  "| Gate | Status |",
  "|---|---:|",
  ...gateChecks.map(([name, ok]) => `| ${name} | ${ok ? "PASS" : "FAIL"} |`),
  "",
  "## Manual derived-state mutation scan",
  "",
  manualDerivedStateFindings.length
    ? "| File | Finding |\n|---|---|\n" + manualDerivedStateFindings.map((f) => `| \`${f.file}\` | ${f.finding} |`).join("\n")
    : "No suspicious manual derived-state mutation patterns detected in `app/` or `lib/`.",
  "",
].join("\n");
fs.writeFileSync(path.join(outDir, "deployment-gates-checklist.md"), gatesReport);

const reconcileRows = [
  ["Orchestration endpoint exists", fs.existsSync(path.join(root, "app", "api", "workflow", "transition", "route.ts")), "app/api/workflow/transition/route.ts", "Critical"],
  ["Workflow transition matrix exists", /workflow_transition_rules/i.test(migrationText), "supabase/migrations/0056_runtime_semantics_orchestration_hardening.sql", "Critical"],
  ["Append-only audit trigger exists", /prevent_append_only_mutation/i.test(migrationText), "supabase/migrations/0056_runtime_semantics_orchestration_hardening.sql", "Critical"],
  ["Certified lock guard exists", /guard_certified_project_mutation/i.test(migrationText), "supabase/migrations/0056_runtime_semantics_orchestration_hardening.sql", "Critical"],
  ["Security event logging exists", /security_events/i.test(migrationText), "supabase/migrations/0056_runtime_semantics_orchestration_hardening.sql", "High"],
  ["Runtime repair procedures exist", /repair_project_state/i.test(migrationText) && /rebuild_derived_states/i.test(migrationText), "supabase/migrations/0056_runtime_semantics_orchestration_hardening.sql", "High"],
  ["No manual derived-state mutation pattern found", manualDerivedStateFindings.length === 0, "app/, lib/ scan", "High"],
];

const reconcileReport = [
  "# Orchestration reconcile audit",
  "",
  "| Requirement | Status | Evidence | Severity |",
  "|---|---:|---|---|",
  ...reconcileRows.map(([requirement, ok, evidence, severity]) => `| ${requirement} | ${ok ? "PASS" : "FAIL"} | \`${evidence}\` | ${severity} |`),
  "",
].join("\n");
fs.writeFileSync(path.join(outDir, "orchestration-reconcile-audit.md"), reconcileReport);

const criticalFailures = [...gateChecks, ...reconcileRows.filter((row) => row[3] === "Critical").map((row) => [row[0], row[1]])]
  .filter(([, ok]) => !ok);

if (criticalFailures.length > 0) {
  console.error("Critical deployment gate failures:");
  for (const [name] of criticalFailures) {
    console.error(`- ${name}`);
  }
  process.exitCode = 1;
}

console.log("Runtime audit reports generated:");
console.log("- artifacts/reports/api-enforcement-audit.md");
console.log("- artifacts/reports/db-enforcement-audit.md");
console.log("- artifacts/reports/deployment-gates-checklist.md");
console.log("- artifacts/reports/orchestration-reconcile-audit.md");
