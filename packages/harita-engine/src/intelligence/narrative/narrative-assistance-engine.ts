// ============================================================
// NarrativeAssistanceEngine
// ============================================================
// Generates a professionally-worded compliance narrative for
// a specific IGBC credit, grounded in:
//   - The ontology review criteria for that credit
//   - Any project context passed in (e.g. team members, location)
//
// Trigger queries:
//   "Write a narrative for EDA C1"
//   "Draft a narrative for WE C1"
//   "Help me write the narrative for EDA C1"
//   "What should I write in the narrative for EDA C1?"
// ============================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { ReasoningOutput } from "../reasoning/reasoning-engine";
import { compress } from "headroom-ai";

export class NarrativeAssistanceEngine {
  public static async draft(query: string, runtimeContext: any): Promise<ReasoningOutput> {
    const supabase = createAdminClient();

    // ── 1. Extract credit code from query ────────────────────────────────
    const creditMatch = query.match(/([a-zA-Z]{2,3}\s*C\d+)/i);
    const creditCode = creditMatch?.[1]?.toUpperCase().replace(/\s+/, " ") ?? null;

    if (!creditCode) {
      return {
        directAnswer: "Please specify a credit code so I can draft the narrative. For example: 'Write a narrative for EDA C1'.",
        evidence: "No credit code detected in query.",
        igbcInterpretation: "Narrative drafts are credit-specific.",
        risks: "None",
        recommendations: "Specify a credit code like EDA C1, WE C1, MR C1."
      };
    }

    // ── 2. Fetch credit + criteria from ontology ─────────────────────────
    const { data: credit } = await supabase
      .from("knowledge_credit")
      .select("id, code, title, description")
      .eq("code", creditCode)
      .maybeSingle();

    if (!credit) {
      return {
        directAnswer: `Credit ${creditCode} was not found in the Knowledge Repository.`,
        evidence: "Credit not found.",
        igbcInterpretation: "Only known IGBC credits can have narratives drafted.",
        risks: "Unknown credit.",
        recommendations: `Verify the credit code. Use 'What documents are required for ${creditCode}?' to check if it exists.`
      };
    }

    const { data: reviewCriteria } = await supabase
      .from("knowledge_review_criteria")
      .select("description")
      .eq("credit_id", credit.id);

    const { data: submissionCriteria } = await supabase
      .from("knowledge_submission_criteria")
      .select("description")
      .eq("credit_id", credit.id);

    const criteria = [
      ...(reviewCriteria?.map((r: any) => `- ${r.description}`) || []),
      ...(submissionCriteria?.map((s: any) => `- ${s.description}`) || []),
    ].join("\n") || "No criteria seeded for this credit.";

    // ── 3. Build project context (if available) ──────────────────────────
    const projectName = runtimeContext?.project?.name ?? "the project";
    const location = runtimeContext?.project?.location ?? "the project site";

    const systemPrompt = `You are Harita, the IGBC Certification Consultant AI.
Draft a professional compliance narrative for the IGBC credit below.

Credit Code: ${creditCode}
Credit Title: ${credit.title}
Credit Description: ${(credit as any).description || "N/A"}

Review and Submission Criteria:
${criteria}

Project Context:
- Project Name: ${projectName}
- Location: ${location}

Instructions:
- Write a clear, professional narrative of 3-5 paragraphs
- Begin with an overview statement of design intent
- Address each criterion explicitly
- Use formal technical language suitable for IGBC review submission
- Do NOT include placeholder brackets — write actual content based on the project context
- Keep it factual, avoiding unsupported claims
`;

    let geminiContents: any[] = [
      { role: "user", parts: [{ text: `Draft a submission narrative for IGBC credit ${creditCode}: ${credit.title}.` }] }
    ];

    try {
      const cr = await compress(geminiContents, { model: "gemini-2.5-flash", fallback: true });
      geminiContents = cr.messages || geminiContents;
    } catch { /* ignore */ }

    // ── 4. Call LLM ───────────────────────────────────────────────────────
    const narrative = await NarrativeAssistanceEngine._callLLM(systemPrompt, geminiContents);

    return {
      directAnswer: narrative,
      evidence: JSON.stringify({ creditCode, criteriaCount: (reviewCriteria?.length ?? 0) + (submissionCriteria?.length ?? 0) }),
      igbcInterpretation: `Narrative drafted for ${creditCode} based on ${(reviewCriteria?.length ?? 0) + (submissionCriteria?.length ?? 0)} ontology criteria.`,
      risks: "Narrative is AI-generated — validate against actual project documents before submission.",
      recommendations: `Review and customize the narrative, then upload it as a Narrative document for ${creditCode}.`
    };
  }

  private static async _callLLM(systemPrompt: string, contents: any[]): Promise<string> {
    const geminiKeys = env.geminiApiKeys || [];
    const groqKeys = env.groqApiKeys || [];
    const openaiKeys = env.openAiApiKeys || [];

    // Gemini
    for (const apiKey of geminiKeys) {
      for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
        try {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: { temperature: 0.3 }
            })
          });
          if (!r.ok) continue;
          const d = await r.json();
          const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        } catch { /* try next */ }
      }
    }

    // Groq
    for (const apiKey of groqKeys) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: contents[0]?.parts?.[0]?.text ?? contents[0]?.content ?? "" }],
            temperature: 0.3
          })
        });
        if (!r.ok) continue;
        const d = await r.json();
        const text = d.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } catch { /* try next */ }
    }

    // OpenAI
    for (const apiKey of openaiKeys) {
      try {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: contents[0]?.parts?.[0]?.text ?? contents[0]?.content ?? "" }],
            temperature: 0.3
          })
        });
        if (!r.ok) continue;
        const d = await r.json();
        const text = d.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } catch { /* try next */ }
    }

    return `Unable to generate narrative — all LLM providers are temporarily unavailable. Please try again shortly.`;
  }
}
