import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const maxDuration = 300; // Vercel max timeout (5 mins)

const creditSchema = {
  type: "ARRAY",
  description: "A list of green building credits extracted from the guidebook.",
  items: {
    type: "OBJECT",
    properties: {
      category: {
        type: "STRING",
        description: "The overarching category section (e.g. Eco Design Approach, Water Conservation)"
      },
      credit_code: {
        type: "STRING",
        description: "The abbreviation code (e.g. EDA MR1, EDA C1)"
      },
      credit_name: {
        type: "STRING",
        description: "The full title of the credit"
      },
      is_mandatory: {
        type: "BOOLEAN",
        description: "true if it's a Mandatory Requirement (MR)"
      },
      max_points: {
        type: "INTEGER",
        description: "0 for mandatory, otherwise the max points available for the credit"
      },
      what_to_submit: {
        type: "STRING",
        description: "Brief bulleted summary of required documents"
      },
      documentation_summary: {
        type: "STRING",
        description: "Brief summary of the credit's intent and requirements"
      }
    },
    required: ["category", "credit_code", "credit_name", "is_mandatory", "max_points"]
  }
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || env.geminiApiKeys?.[0];
    if (!geminiKey) {
      return NextResponse.json({ error: "No Gemini API key available." }, { status: 500 });
    }

    // 1. Prepare PDF as base64 for Multimodal processing
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: base64Data
      }
    };

    // --- PASS 1: EXTRACT INDEX ---
    const indexSchema = {
      type: "ARRAY",
      description: "A strict index of green building credits extracted from the summary checklist.",
      items: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING" },
          credit_code: { type: "STRING" },
          credit_name: { type: "STRING" },
          is_mandatory: { type: "BOOLEAN" },
          max_points: { type: "INTEGER" }
        },
        required: ["category", "credit_code", "credit_name", "is_mandatory", "max_points"]
      }
    };

    const indexPrompt = `You are an expert at extracting structured green building framework data from PDF Guidebooks.
Your goal is to locate the summary "Points Distribution" or "Checklist" table in the document and extract a strict index of all credits and mandatory requirements.
CRITICAL RULES:
- Only extract the summary list. Do not extract detailed documentation yet.
- Ensure you do not miss any credits. Look carefully at the table structure.
- Mandatory Requirements (MR) should have max_points = 0 and is_mandatory = true.`;

    const indexRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey as string },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: indexPrompt }] },
          contents: [{ role: "user", parts: [pdfPart, { text: "Extract the strict credit index from the summary tables." }] }],
          generationConfig: { 
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: indexSchema
          },
        }),
      }
    );

    if (!indexRes.ok) {
      const errorText = await indexRes.text();
      return NextResponse.json({ error: "Index API failed: " + errorText }, { status: 500 });
    }

    const indexData = await indexRes.json();
    const indexText = indexData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    let indexJson = [];
    try {
      indexJson = JSON.parse(indexText);
    } catch (e) {
      return NextResponse.json({ error: "Failed to parse index JSON" }, { status: 500 });
    }

    if (indexJson.length === 0) {
      return NextResponse.json({ error: "No credits found in the summary tables." }, { status: 400 });
    }

    // --- PASS 2: MAP DETAILS ---
    const mapPrompt = `You are an expert at mapping detailed requirements to a strict credit index.
I am providing you with the strict index of credits extracted from the summary tables.
Your job is to read the full guidebook and extract the "documentation_summary" (a brief summary of the required documents) for each credit in the index.

CRITICAL RULES:
1. DO NOT ADD any credits that are not in the provided index.
2. DO NOT REMOVE any credits from the provided index.
3. Keep the exact category, credit_code, credit_name, is_mandatory, and max_points from the index.
4. Just fill in the \`documentation_summary\` for each one based on the detailed sections of the manual.`;

    const mapRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey as string },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: mapPrompt }] },
          contents: [{ role: "user", parts: [
            pdfPart, 
            { text: "Here is the strict index. Map the detailed documentation requirements to it:\n" + indexText }
          ] }],
          generationConfig: { 
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: creditSchema
          },
        }),
      }
    );

    if (!mapRes.ok) {
      const errText = await mapRes.text();
      return NextResponse.json({ error: "Map API failed: " + errText }, { status: 500 });
    }

    const mapData = await mapRes.json();
    const finalText = mapData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    let parsedJson = [];
    try {
      parsedJson = JSON.parse(finalText);
    } catch (parseError) {
      return NextResponse.json({ error: "Failed to parse final JSON string." }, { status: 500 });
    }

    return NextResponse.json({ credits: parsedJson });

  } catch (error: any) {
    console.error("Parse Guidebook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
