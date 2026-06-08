import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();
const migrationsDir = path.join(root, "supabase", "migrations");

function migrationText() {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8"))
    .join("\n\n");
}

test.describe("tenant isolation enforcement", () => {
  test("project-scoped tables enforce RLS through authenticated membership lineage", () => {
    const sql = migrationText();

    expect(sql).toMatch(/alter table public\.projects enable row level security/i);
    expect(sql).toMatch(/alter table public\.project_users enable row level security/i);
    expect(sql).toMatch(/alter table public\.project_document enable row level security/i);
    expect(sql).toMatch(/auth\.uid\(\)/i);
    expect(sql).toMatch(/project_users/i);
  });

  test("runtime governance tables keep project lineage for isolation audits", () => {
    const sql = migrationText();

    expect(sql).toMatch(/create table if not exists public\.security_events/i);
    expect(sql).toMatch(/project_id uuid references public\.projects\(id\)/i);
    expect(sql).toMatch(/create table if not exists public\.validation_snapshots/i);
    expect(sql).toMatch(/project_id uuid not null references public\.projects\(id\)/i);
    expect(sql).toMatch(/create table if not exists public\.certification_snapshots/i);
  });
});
