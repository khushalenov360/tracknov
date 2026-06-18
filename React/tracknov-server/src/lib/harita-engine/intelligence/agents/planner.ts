import { env } from "@/lib/env";
import { plannerPersona } from "./plannerPersona";

export type ExecutionPlan = {
  intent: "credit_query" | "general_qa" | "document_analysis" | "workflow_action" | "unknown";
  target_credit_code: string | null;
  tools_required: string[];
  reasoning: string;
  source_query: string;
  module_category: string | null;
};

export async function generateExecutionPlan(
  query: string,
  surface: string,
  role?: string,
  historySummary?: string
): Promise<ExecutionPlan> {
  const geminiKey = process.env.GEMINI_API_KEY || env.geminiApiKeys?.[0];
  const groqKey = process.env.GROQ_API_KEY || env.groqApiKeys?.[0];

  const systemPrompt = `${plannerPersona}

Your job is to isolate intent, classify the module category, and output a strict JSON execution plan.

Available Intents:
- "credit_query": User is asking about the status, assignee, or requirements of a specific credit code (e.g. "who is assigned to EE C4?", "what is the status of IM MR1?").
- "general_qa": User is asking general green building, IGBC certification, or platform capability questions.
- "document_analysis": User is asking to review, analyze, or compare an attached document.
- "workflow_action": User is asking to perform an action (e.g., upload, map, submit, assign). Note: AI can only suggest or route these, not execute directly.

Available Tools:
- "get_credit_status": Query status, points, and details of a credit.
- "get_credit_assignments": Query team member assignments for a credit.
- "get_credit_checklists": Get requirements and documentation checklists.
- "query_guidebook": Run a RAG search on the IGBC guidebook.
- "get_project_members": List members in the project.

Module Categories:
- "ECO_DESIGN"
- "WATER_CONSERVATION"
- "ENERGY_EFFICIENCY"
- "MATERIALS_RESOURCES"
- "INDOOR_ENVIRONMENTAL_QUALITY"
- "INNOVATION_DESIGN"

JSON Output Schema:
{
  "intent": "credit_query" | "general_qa" | "document_analysis" | "workflow_action" | "unknown",
  "target_credit_code": "EE C4" | null, // Extract specific code if mentioned (e.g., "EE C4", "IM MR1")
  "tools_required": ["get_credit_status", ...],
  "reasoning": "Brief explanation of the plan",
  "source_query": "The user's original question",
  "module_category": "ENERGY_EFFICIENCY" | null
}

Do not include any markup, markdown tags, or markdown blocks like \`\`\`json. Output raw JSON only.`;

  const userMessage = `User Query: "${query}"
Active Surface: "${surface}"
User Role: "${role ?? "unknown"}"
Previous Session Summary: "${historySummary ?? "none"}"`;

  // Helper to try Gemini
  if (geminiKey) {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
              maxOutputTokens: 150
            }
          }),
          signal: AbortSignal.timeout(15000)
        }
      );
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return JSON.parse(text.trim()) as ExecutionPlan;
        }
      }
    } catch (e) {
      console.warn("[Planner] Gemini call failed, falling back to Groq...", e);
    }
  }

  // Fallback to Groq
  if (groqKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 150
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          return JSON.parse(text.trim()) as ExecutionPlan;
        }
      }
    } catch (e) {
      console.warn("[Planner] Groq fallback failed.", e);
    }
  }

  // Final fallback
  const normalized = query.trim().toUpperCase();
  const creditMatch =
    normalized.match(/\b(EDA|WC|EE|IM|IE|IID)\s*(?:C|MR|P)?\s*\d+\b/) ??
    normalized.match(/\b(EDA|WC|EE|IM|IE|IID)[-_]?(?:C|MR|P)?\d+\b/);
  const targetCreditCode = creditMatch ? creditMatch[0].replace(/[_-]/g, " ").replace(/\s+/g, " ").trim() : null;
  const lowerQuery = query.toLowerCase();
  const isCreditFactQuestion =
    Boolean(targetCreditCode) &&
    /(who|what|which|status|assigned|responsible|requirement|checklist|points|score)/.test(lowerQuery);
  const intent =
    isCreditFactQuestion
      ? "credit_query"
      : /upload|submit|delete|update|map/.test(lowerQuery)
        ? "workflow_action"
        : /document|drawing|sheet|pdf|scan|certificate/.test(lowerQuery)
          ? "document_analysis"
          : targetCreditCode
            ? "credit_query"
            : "general_qa";

  const toolsRequired = targetCreditCode
    ? [
        "get_credit_status",
        ...( /assign|owner|responsible/.test(lowerQuery) ? ["get_credit_assignments"] : []),
        ...( /requirement|checklist|submit/.test(lowerQuery) ? ["get_credit_checklists"] : []),
      ]
    : ["query_guidebook"];

  return {
    intent,
    target_credit_code: targetCreditCode,
    tools_required: toolsRequired,
    reasoning: "Planner LLM unavailable, using deterministic fallback intent classification.",
    source_query: query,
    module_category: inferModuleCategory(query, targetCreditCode),
  };
}

function inferModuleCategory(query: string, targetCreditCode: string | null): string | null {
  const normalized = `${targetCreditCode ?? ""} ${query}`.toUpperCase();
  if (normalized.includes("EDA")) return "ECO_DESIGN";
  if (normalized.includes("WC")) return "WATER_CONSERVATION";
  if (normalized.includes("EE")) return "ENERGY_EFFICIENCY";
  if (normalized.includes("MR")) return "MATERIALS_RESOURCES";
  if (normalized.includes("IE")) return "INDOOR_ENVIRONMENTAL_QUALITY";
  if (normalized.includes("IID") || normalized.includes("IM")) return "INNOVATION_DESIGN";
  return null;
}
