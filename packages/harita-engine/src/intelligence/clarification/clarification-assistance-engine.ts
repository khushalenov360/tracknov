// ============================================================
// ClarificationAssistanceEngine
// ============================================================
// When a reviewer sends a clarification request or rejects a
// document, this engine reads the review remarks and drafts a
// professional response the contributor can send back.
//
// Trigger queries:
//   "Help me respond to the clarification for EDA C1"
//   "Draft a clarification response for EDA C1"
//   "How do I reply to the rejection on WE C1?"
//   "Clarification response for EDA C1"
// ============================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { ReasoningOutput } from "../reasoning/reasoning-engine";
import { compress } from "headroom-ai";

export class ClarificationAssistanceEngine {
  public static async draft(query: string, projectId: string, runtimeContext: any): Promise<ReasoningOutput> {
    const supabase = createAdminClient();

    // ── 1. Extract credit code ────────────────────────────────────────────
    const creditMatch = query.match(/([a-zA-Z]{2,3}\s*C\d+)/i);
    const creditCode = creditMatch?.[1]?.toUpperCase().replace(/\s+/, " ") ?? null;

    if (!creditCode) {
      return {
        directAnswer: "Please specify which credit the clarification is for. Example: 'Draft a clarification response for EDA C1'.",
        evidence: "No credit code in query.",
        igbcInterpretation: "Clarification drafting is credit-specific.",
        risks: "None",
        recommendations: "Try: 'Help me respond to the clarification for EDA C1'."
      };
    }

    // ── 2. Find latest clarification/rejection remark for this credit ─────
    let rejectionRemarks = "No specific rejection reason on record.";
    let documentName = "Unknown document";

    if (projectId && projectId !== "unknown") {
      const { data: docs } = await supabase
        .from("project_document")
        .select("id, file_name, state, uploaded_at")
        .eq("project_id", projectId)
        .eq("doc_category", creditCode)
        .in("state", ["REJECTED", "CLARIFICATION"])
        .order("uploaded_at", { ascending: false })
        .limit(1);

      if (docs && docs.length > 0) {
        const doc = docs[0];
        documentName = doc.file_name || documentName;

        // Fetch review remarks for this document
        const { data: remarks } = await supabase
          .from("remarks")
          .select("body, role, created_at")
          .eq("document_id", doc.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (remarks && remarks.length > 0) {
          rejectionRemarks = remarks.map((r: any) => `[${r.role}]: ${r.body}`).join("\n");
        }
      }
    }

    // Fallback: try to get credit description for context
    const { data: credit } = await supabase
      .from("knowledge_credit")
      .select("id, code, title")
      .eq("code", creditCode)
      .maybeSingle();

    const creditTitle = (credit as any)?.title || creditCode;
    const { data: reviewCriteria } = await supabase
      .from("knowledge_review_criteria")
      .select("description")
      .eq("credit_id", (credit as any)?.id ?? "")
      .limit(5);

    const criteriaContext = reviewCriteria?.map((r: any) => `- ${r.description}`).join("\n") || "";

    // ── 3. Draft LLM response ─────────────────────────────────────────────
    const systemPrompt = `You are Harita, the IGBC Certification Consultant AI.
A document submitted for IGBC credit ${creditCode} (${creditTitle}) has received a clarification request or rejection.

Reviewer Remarks / Rejection Reason:
${rejectionRemarks}

IGBC Review Criteria for ${creditCode}:
${criteriaContext || "Review criteria not available."}

Document: ${documentName}
Project: ${runtimeContext?.project?.name ?? "Unknown Project"}

First, determine if the Reviewer Remarks are relevant to the IGBC Review Criteria for ${creditCode}.
If the reviewer's request clearly contradicts or has no relevance to the criteria (e.g. asking for a daylight simulation for a credit about water), you MUST output EXACTLY this string and nothing else:
Clarification cannot be mapped to any known review criteria.

If the remarks are relevant, draft a professional clarification response the project team can send back to the reviewer. The response should:
1. Acknowledge the reviewer's specific concern
2. Explain what the project team will provide or correct
3. Reference the relevant IGBC criteria
4. Use a formal, professional tone
5. Be concise (2-3 paragraphs maximum)
`;

    let geminiContents: any[] = [
      { role: "user", parts: [{ text: `Draft a clarification response to the reviewer for IGBC credit ${creditCode}.` }] }
    ];

    try {
      const cr = await compress(geminiContents, { model: "gemini-2.5-flash", fallback: true });
      geminiContents = cr.messages || geminiContents;
    } catch { /* ignore */ }

    const clarificationDraft = await ClarificationAssistanceEngine._callLLM(systemPrompt, geminiContents);

    if (clarificationDraft.trim() === "Clarification cannot be mapped to any known review criteria.") {
      return {
        directAnswer: clarificationDraft,
        evidence: JSON.stringify({ creditCode, rejectionRemarks }),
        igbcInterpretation: "The reviewer's remarks do not align with the standard IGBC review criteria for this credit.",
        risks: "Irrelevant or incorrect clarification request from reviewer.",
        recommendations: "Double check the credit requirements or appeal the reviewer's remark."
      };
    }

    return {
      directAnswer: `**Clarification Response Draft for ${creditCode}:**\n\n${clarificationDraft}`,
      evidence: JSON.stringify({ creditCode, documentName, rejectionRemarks }),
      igbcInterpretation: `Clarification drafted for ${creditCode} based on reviewer remarks and IGBC review criteria.`,
      risks: "This is an AI draft — review before sending. Ensure all referenced documents are actually available.",
      recommendations: `Once finalized, upload the revised document and send the clarification response for ${creditCode}.`
    };
  }

  private static async _callLLM(systemPrompt: string, contents: any[]): Promise<string> {
    const geminiKeys = env.geminiApiKeys || [];
    const groqKeys = env.groqApiKeys || [];
    const openaiKeys = env.openAiApiKeys || [];
    const userText = contents[0]?.parts?.[0]?.text ?? contents[0]?.content ?? "";

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

    for (const apiKey of groqKeys) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }],
            temperature: 0.3
          })
        });
        if (!r.ok) continue;
        const d = await r.json();
        const text = d.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } catch { /* try next */ }
    }

    for (const apiKey of openaiKeys) {
      try {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }],
            temperature: 0.3
          })
        });
        if (!r.ok) continue;
        const d = await r.json();
        const text = d.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } catch { /* try next */ }
    }

    return "Unable to draft clarification — all LLM providers are temporarily unavailable. Please try again.";
  }
}
