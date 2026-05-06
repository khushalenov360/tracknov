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
  ["Runtime reconciliation endpoint present", fs.existsSync(path.join(root, "app", "api", "jobs", "runtime", "reconcile", "route.ts"))],
  ["Signed URL endpoint present", fs.existsSync(path.join(root, "app", "api", "documents", "[id]", "route.ts"))],
  ["Rate-limit utility present", fs.existsSync(path.join(root, "lib", "security", "rate-limit.ts"))],
];
const gatesReport = [
  "# Deployment gates checklist automation",
  "",
  "| Gate | Status |",
  "|---|---:|",
  ...gateChecks.map(([name, ok]) => `| ${name} | ${ok ? "PASS" : "FAIL"} |`),
  "",
].join("\n");
fs.writeFileSync(path.join(outDir, "deployment-gates-checklist.md"), gatesReport);

console.log("Runtime audit reports generated:");
console.log("- artifacts/reports/api-enforcement-audit.md");
console.log("- artifacts/reports/db-enforcement-audit.md");
console.log("- artifacts/reports/deployment-gates-checklist.md");

