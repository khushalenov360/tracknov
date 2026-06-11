import { NextResponse } from "next/server";
import { DocumentParser } from "@/lib/harita-engine/document-intelligence/DocumentParser";
import { env } from "@/lib/env";

export const maxDuration = 300; // Vercel max timeout (5 mins)

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Extract text from PDF
    const parser = new DocumentParser();
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parser.parse(buffer, file.name);

    if (!parsed.text || parsed.text.length < 100) {
      return NextResponse.json({ error: "Could not extract text from PDF." }, { status: 400 });
    }

    // 2. Extract structured credits using Gemini
    const geminiKey = process.env.GEMINI_API_KEY || env.geminiApiKeys?.[0];
    if (!geminiKey) {
      return NextResponse.json({ error: "No Gemini API key available." }, { status: 500 });
    }

    const systemPrompt = `You are an expert at extracting structured green building framework data from unstructured PDF text.
The user will provide the raw text of an official Green Building Guidebook (like IGBC Green Interiors).
Your goal is to extract ALL of the credits/mandatory requirements defined in the manual and output them strictly as a JSON array.

Output format must be a JSON array of objects:
[
  {
    "category": "Eco Design Approach", // The overarching category section
    "credit_code": "EDA MR1", // The abbreviation code (e.g. EDA MR1, EDA C1)
    "credit_name": "Eco Design Approach", // The full title of the credit
    "is_mandatory": true, // true if it's a Mandatory Requirement (MR)
    "max_points": 0, // 0 for mandatory, otherwise the max points available for the credit
    "what_to_submit": "Brief bulleted summary of required documents",
    "documentation_summary": "Brief summary of the credit's intent and requirements"
  }
]

CRITICAL RULES:
- Read carefully and make sure NOT to miss any credits.
- Output ONLY valid JSON, starting with [ and ending with ]. Do NOT include markdown code fences (\`\`\`json).`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey as string },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: parsed.text.slice(0, 1000000) }] }], // pass up to 1M chars
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: "Gemini API failed: " + errorText }, { status: 500 });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    // Clean markdown
    const cleanJson = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
      const parsedJson = JSON.parse(cleanJson);
      return NextResponse.json({ credits: parsedJson });
    } catch (parseError) {
      return NextResponse.json({ error: "Failed to parse JSON from LLM: " + cleanJson }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Parse Guidebook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
