import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { DocumentParser } from "../lib/harita-engine/document-intelligence/DocumentParser";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiKey = process.env.GEMINI_API_KEY!;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Reading PDF...");
  const pdfPath = path.join(process.cwd(), "scratch/user_uploaded_guidebook.pdf");
  const buffer = fs.readFileSync(pdfPath);
  
  const base64Data = buffer.toString("base64");
  const pdfPart = { inlineData: { mimeType: "application/pdf", data: base64Data } };
  
  const creditSchema = {
    type: "ARRAY",
    description: "A list of green building credits extracted from the guidebook.",
    items: {
      type: "OBJECT",
      properties: {
        category: { type: "STRING" },
        credit_code: { type: "STRING" },
        credit_name: { type: "STRING" },
        is_mandatory: { type: "BOOLEAN" },
        max_points: { type: "INTEGER" },
        what_to_submit: { type: "STRING" },
        documentation_summary: { type: "STRING" }
      },
      required: ["category", "credit_code", "credit_name", "is_mandatory", "max_points"]
    }
  };

  console.log("PASS 1: Sending to Gemini 1.5 Pro Extractor...");
  const extractorPrompt = `You are an expert at extracting structured green building framework data from PDF Guidebooks.
Read this PDF carefully. Your goal is to extract ALL of the credits and mandatory requirements defined in the manual.
Use the JSON schema provided to format your response exactly as an array of objects.

CRITICAL RULES:
- Read carefully and make sure NOT to miss any credits.
- Look at the tables! The tables define the points and mandatory status.
- Mandatory Requirements (MR) should have max_points = 0 and is_mandatory = true.`;

  const extractorRes = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: extractorPrompt }] },
        contents: [{ role: "user", parts: [pdfPart, { text: "Extract the credits from this guidebook PDF." }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: creditSchema },
      }),
    }
  );

  if (!extractorRes.ok) throw new Error("Extractor failed: " + await extractorRes.text());
  const extractorData = await extractorRes.json();
  const extractedText = extractorData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  console.log("PASS 2: Sending to Gemini 1.5 Pro Auditor...");
  
  let attempts = 0;
  let validationError = null;
  let credits = [];
  let auditorSuccess = false;

  while (attempts < 2 && !auditorSuccess) {
    attempts++;
    const errorContext = validationError ? "\\n\\nWARNING: " + validationError + "\\nFIX THESE ISSUES." : "";
    const auditorPrompt = `You are an expert Auditor of Green Building frameworks.
Audit this JSON against the PDF.
1. Check for MISSING credits.
2. Check for PHANTOM credits (remove if not in PDF).
3. Verify POINT VALUES (max_points).
4. Verify NAMES and CATEGORIES.
5. NO DUPLICATE CREDIT CODES allowed.
6. Mandatory credits MUST have max_points = 0.` + errorContext;

    const auditorRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: auditorPrompt }] },
          contents: [{ role: "user", parts: [pdfPart, { text: "Audit this JSON:\\n" + extractedText }] }],
          generationConfig: { temperature: validationError ? 0.4 : 0.1, responseMimeType: "application/json", responseSchema: creditSchema },
        }),
      }
    );

    if (!auditorRes.ok) throw new Error("Auditor failed: " + await auditorRes.text());
    const auditorData = await auditorRes.json();
    const finalText = auditorData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    try {
      credits = JSON.parse(finalText);
      
      const codes = new Set();
      const duplicateCodes = [];
      const invalidMandatory = [];
      for (const credit of credits) {
        if (codes.has(credit.credit_code)) duplicateCodes.push(credit.credit_code);
        codes.add(credit.credit_code);
        if (credit.is_mandatory && credit.max_points !== 0) invalidMandatory.push(credit.credit_code);
      }
      
      if (duplicateCodes.length > 0 || invalidMandatory.length > 0) {
        validationError = "Duplicates: " + duplicateCodes.join(", ") + ". Invalid MR points: " + invalidMandatory.join(", ");
        console.log("Validation failed, retrying...", validationError);
        continue;
      }
      auditorSuccess = true;
    } catch (e) {
      validationError = "Parse error";
    }
  }
  
  if (!auditorSuccess) throw new Error("Failed to parse reliably after 2 attempts");

  console.log(`Parsed ${credits.length} credits. Upserting to DB...`);

  let { data: rsData } = await adminClient.from("rating_systems").select("id").eq("name", "IGBC Green Interiors").single();
  const rsId = rsData!.id;

  const uniqueCategories = Array.from(new Set(credits.map((c: any) => c.category).filter(Boolean)));
  const categoryMap: Record<string, string> = {};

  for (let i = 0; i < uniqueCategories.length; i++) {
    const catName = uniqueCategories[i] as string;
    const { data: catData } = await adminClient
      .from("credit_categories")
      .upsert({ rating_system_id: rsId, name: catName, display_order: i + 1 }, { onConflict: 'rating_system_id,name' })
      .select("id").single();
    if (catData) categoryMap[catName] = catData.id;
  }

  for (const c of credits) {
    const catId = categoryMap[c.category];
    if (!catId) continue;
    const { error: upsertError } = await adminClient.from("credit_templates").upsert(
      {
        rating_system_id: rsId,
        category_id: catId,
        code: c.credit_code,
        name: c.credit_name,
        is_mandatory: c.is_mandatory || false,
        max_points: c.max_points || 0,
        documentation_summary: c.documentation_summary || ""
      },
      { onConflict: 'rating_system_id,code' }
    );
    if (upsertError) {
      console.error("UPSERT ERROR:", upsertError);
    }
    
    // Also update project_credits directly to sync it
    await adminClient.from("project_credits").update({ 
      max_points: c.max_points || 0,
      credit_name: c.credit_name
    }).eq("credit_code", c.credit_code);
  }
  
  console.log("Done! Checking final point sum...");
  const { data: pCredits } = await adminClient.from('project_credits').select('credit_code, max_points, na').eq('project_id', '1fabd316-6d0f-4de3-a149-7e23c528aab9');
  const total = pCredits!.reduce((sum: number, c: any) => sum + (c.max_points || 0), 0);
  console.log("Total base points in DB:", total);
}

run().catch(console.error);
