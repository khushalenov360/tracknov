/**
 * scratch/test_assessment.ts
 * Run from repo root: npx tsx scratch/test_assessment.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { EvidenceAssessmentEngine } from "../packages/harita-engine/src/intelligence/evidence/evidence-assessment-engine";

dotenv.config({ path: "apps/tracknov-web/.env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.split(",")[0].trim() || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  // ── Find EDA C1 ─────────────────────────────────────────────────────────
  const { data: credit, error } = await supabase
    .from("knowledge_credit")
    .select("id, code, title")
    .eq("code", "EDA C1")
    .maybeSingle();

  if (error || !credit) {
    console.error("EDA C1 not found:", error);
    process.exit(1);
  }
  console.log(`Credit: ${credit.code} — ${credit.title} (${credit.id})\n`);

  // ── Simulate Layout.pdf parsed text ─────────────────────────────────────
  const documentName = "Layout.pdf";
  const parsedContent = `
Architectural Drawing — Ground Floor Circulation Plan
Project: Headroom Tech Park, Hyderabad
Drawing No: A-101 | Rev 2 | Date: 2026-05-10

CIRCULATION:
This drawing illustrates the circulation layout across the ground floor.
Passage width along primary corridors: 2.5 m clear width.
Secondary corridor: 1.8 m clear width.

SITE FEATURES:
Preserved existing banyan tree (marked in green on site plan).

KEY DIMENSIONS:
  - Total built-up area: [NOT PROVIDED IN THIS SHEET]
  - Occupancy type: [NOT SPECIFIED]
  - Occupancy calculation: [NOT PROVIDED]
  - Area Statement: [NOT PROVIDED]
`;

  console.log("═".repeat(60));
  console.log("Running Evidence Assessment Engine...");
  console.log("═".repeat(60));

  const result = await EvidenceAssessmentEngine.assess(
    supabase,
    { geminiApiKey: GEMINI_API_KEY, groqApiKey: GROQ_API_KEY, openaiApiKey: OPENAI_API_KEY },
    credit.id,
    documentName,
    parsedContent
  );

  console.log(`\nHarita responds:\n`);
  console.log(`Detected:\n  ${result.detectedType}`);
  console.log(`\nMapped Credit:\n  ${result.mappedCredit}`);
  console.log(`\nEvidence Found:`);
  if (result.evidenceFound.length) result.evidenceFound.forEach(e => console.log(`  ✓ ${e}`));
  else console.log("  (none)");
  console.log(`\nMissing Evidence:`);
  if (result.missingEvidence.length) result.missingEvidence.forEach(e => console.log(`  ✗ ${e}`));
  else console.log("  (none)");
  if (result.weakEvidence.length) {
    console.log(`\nWeak Evidence:`);
    result.weakEvidence.forEach(e => console.log(`  ⚠ ${e}`));
  }
  if (result.duplicateEvidence.length) {
    console.log(`\nDuplicate Evidence:`);
    result.duplicateEvidence.forEach(e => console.log(`  ↺ ${e}`));
  }
  console.log(`\nEvidence Strength: ${result.strengthScore}%`);
  console.log(`Readiness:         ${result.readinessState}`);
  console.log(`Recommended Action: ${result.recommendedAction}`);
  console.log("\n" + "═".repeat(60));
}

run().catch(err => { console.error(err); process.exit(1); });
