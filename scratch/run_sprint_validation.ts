import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import { DocumentParser } from '../packages/harita-engine/src/document-intelligence/DocumentParser';

// Use same env logic as run_validations.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../apps/tracknov-web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const adminClient = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== SPRINT VALIDATION START ===\n");

  // 1. Verify Workflow Ontology Completion
  console.log("--- 1. VERIFY WORKFLOW ONTOLOGY ---");
  const evidenceTypes = [
    'CALCULATION', 'WATER_CALCULATION', 'ENERGY_MODEL',
    'DAYLIGHT_ANALYSIS', 'PHOTO', 'SPECIFICATION', 'INVOICE'
  ];
  
  for (const type of evidenceTypes) {
    const { data: et } = await adminClient.from('knowledge_evidence_type').select('id').eq('name', type).single();
    if (!et) {
      console.log(`[FAILED] Evidence type ${type} not found`);
      continue;
    }
    const { data: roles, error } = await adminClient.from('workflow_document_responsibility')
      .select('role_id, action, workflow_role(name)')
      .eq('evidence_type_id', et.id);
      
    if (error) console.error("Error:", error);
    if (!roles || roles.length === 0) {
      console.log(`[FAILED] No roles assigned for ${type}`);
    } else {
      // @ts-ignore
      console.log(`[PASS] ${type}: assigned to ${roles.map(r => r.workflow_role?.name).join(', ')}`);
    }
  }

  console.log("\n--- 2. VERIFY REVIEW CRITERIA SEEDING ---");
  const { count: reviewCount } = await adminClient.from('knowledge_review_criteria').select('*', { count: 'exact', head: true });
  const { count: subCount } = await adminClient.from('knowledge_submission_criteria').select('*', { count: 'exact', head: true });
  
  console.log(`knowledge_review_criteria row count: ${reviewCount}`);
  console.log(`knowledge_submission_criteria row count: ${subCount}`);
  if (reviewCount && reviewCount > 0 && subCount && subCount > 0) {
    console.log("[PASS] Criteria seeding is complete.");
  } else {
    console.log("[FAILED] Criteria seeding is incomplete.");
  }

  console.log("\n--- 3. VERIFY REAL FILE PARSING ---");
  const parser = new DocumentParser();
  const filesToTest = [
    'Layout.pdf',
    'WaterCalculation.xlsx',
    'Narrative.docx',
    'SitePhoto.jpg'
  ];

  for (const file of filesToTest) {
    console.log(`\nParsing ${file}...`);
    try {
      const buffer = fs.readFileSync(path.join(__dirname, file));
      const parsed = await parser.parse(buffer, file);
      console.log(`Metadata: ${JSON.stringify(parsed.metadata)}`);
      if (parsed.text) {
        console.log(`Extracted Text: ${parsed.text.substring(0, 100).trim()}...`);
      } else {
        console.log(`Extracted Text: (empty)`);
      }
      if (parsed.tables && parsed.tables.length > 0) {
        console.log(`Tables: Found ${parsed.tables.length} table(s)`);
      }
      console.log(`[PASS] ${file} parsed successfully`);
    } catch (err: any) {
      console.log(`[FAILED] Failed to parse ${file}: ${err.message}`);
    }
  }

  console.log("\n=== SPRINT VALIDATION COMPLETE ===");
}

run().catch(console.error);
