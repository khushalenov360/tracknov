"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateExecutionPlan = generateExecutionPlan;
const env_1 = require("@/lib/env");
function generateExecutionPlan(query, surface, role, historySummary) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const geminiKey = process.env.GEMINI_API_KEY || ((_a = env_1.env.geminiApiKeys) === null || _a === void 0 ? void 0 : _a[0]);
        const groqKey = process.env.GROQ_API_KEY || ((_b = env_1.env.groqApiKeys) === null || _b === void 0 ? void 0 : _b[0]);
        const systemPrompt = `You are a high-speed Planner Agent for a green building certification assistant.
Your job is to parse the user's query and output a strict JSON object mapping their intent to execution steps.

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

JSON Output Schema:
{
  "intent": "credit_query" | "general_qa" | "document_analysis" | "workflow_action" | "unknown",
  "target_credit_code": "EE C4" | null, // Extract specific code if mentioned (e.g., "EE C4", "IM MR1")
  "tools_required": ["get_credit_status", ...],
  "reasoning": "Brief explanation of the plan"
}

Do not include any markup, markdown tags, or markdown blocks like \`\`\`json. Output raw JSON only.`;
        const userMessage = `User Query: "${query}"
Active Surface: "${surface}"
User Role: "${role !== null && role !== void 0 ? role : "unknown"}"
Previous Session Summary: "${historySummary !== null && historySummary !== void 0 ? historySummary : "none"}"`;
        // Helper to try Gemini
        if (geminiKey) {
            try {
                const response = yield fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
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
                });
                if (response.ok) {
                    const data = yield response.json();
                    const text = (_g = (_f = (_e = (_d = (_c = data.candidates) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.parts) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.text;
                    if (text) {
                        return JSON.parse(text.trim());
                    }
                }
            }
            catch (e) {
                console.warn("[Planner] Gemini call failed, falling back to Groq...", e);
            }
        }
        // Fallback to Groq
        if (groqKey) {
            try {
                const response = yield fetch("https://api.groq.com/openai/v1/chat/completions", {
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
                    const data = yield response.json();
                    const text = (_k = (_j = (_h = data.choices) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.message) === null || _k === void 0 ? void 0 : _k.content;
                    if (text) {
                        return JSON.parse(text.trim());
                    }
                }
            }
            catch (e) {
                console.warn("[Planner] Groq fallback failed.", e);
            }
        }
        // Final fallback
        return {
            intent: "unknown",
            target_credit_code: null,
            tools_required: [],
            reasoning: "Failed to contact planner LLM, proceeding with direct RAG/Q&A fallback."
        };
    });
}
