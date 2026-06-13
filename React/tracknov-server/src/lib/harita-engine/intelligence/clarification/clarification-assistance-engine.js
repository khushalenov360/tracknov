"use strict";
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
exports.ClarificationAssistanceEngine = void 0;
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
const headroom_ai_1 = require("headroom-ai");
class ClarificationAssistanceEngine {
    static draft(query, projectId, runtimeContext) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const supabase = (0, admin_1.createAdminClient)();
            // ── 1. Extract credit code ────────────────────────────────────────────
            const creditMatch = query.match(/([a-zA-Z]{2,3}\s*C\d+)/i);
            const creditCode = (_b = (_a = creditMatch === null || creditMatch === void 0 ? void 0 : creditMatch[1]) === null || _a === void 0 ? void 0 : _a.toUpperCase().replace(/\s+/, " ")) !== null && _b !== void 0 ? _b : null;
            if (!creditCode) {
                return {
                    consultantAssessment: "Please specify which credit the clarification is for. Example: 'Draft a clarification response for EDA C1'.",
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
                const { data: docs } = yield supabase
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
                    const { data: remarks } = yield supabase
                        .from("remarks")
                        .select("body, role, created_at")
                        .eq("document_id", doc.id)
                        .order("created_at", { ascending: false })
                        .limit(5);
                    if (remarks && remarks.length > 0) {
                        rejectionRemarks = remarks.map((r) => `[${r.role}]: ${r.body}`).join("\n");
                    }
                }
            }
            // Fallback: try to get credit description for context
            const { data: credit } = yield supabase
                .from("knowledge_credit")
                .select("id, code, title")
                .eq("code", creditCode)
                .maybeSingle();
            const creditTitle = (credit === null || credit === void 0 ? void 0 : credit.title) || creditCode;
            const { data: reviewCriteria } = yield supabase
                .from("knowledge_review_criteria")
                .select("description")
                .eq("credit_id", (_c = credit === null || credit === void 0 ? void 0 : credit.id) !== null && _c !== void 0 ? _c : "")
                .limit(5);
            const criteriaContext = (reviewCriteria === null || reviewCriteria === void 0 ? void 0 : reviewCriteria.map((r) => `- ${r.description}`).join("\n")) || "";
            // ── 3. Draft LLM response ─────────────────────────────────────────────
            const systemPrompt = `You are Harita, the IGBC Certification Consultant AI.
A document submitted for IGBC credit ${creditCode} (${creditTitle}) has received a clarification request or rejection.

Reviewer Remarks / Rejection Reason:
${rejectionRemarks}

IGBC Review Criteria for ${creditCode}:
${criteriaContext || "Review criteria not available."}

Document: ${documentName}
Project: ${(_e = (_d = runtimeContext === null || runtimeContext === void 0 ? void 0 : runtimeContext.project) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : "Unknown Project"}

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
            let geminiContents = [
                { role: "user", parts: [{ text: `Draft a clarification response to the reviewer for IGBC credit ${creditCode}.` }] }
            ];
            try {
                const cr = yield (0, headroom_ai_1.compress)(geminiContents, { model: "gemini-2.5-flash", fallback: true });
                geminiContents = cr.messages || geminiContents;
            }
            catch ( /* ignore */_f) { /* ignore */ }
            const clarificationDraft = yield ClarificationAssistanceEngine._callLLM(systemPrompt, geminiContents);
            if (clarificationDraft.trim() === "Clarification cannot be mapped to any known review criteria.") {
                return {
                    consultantAssessment: clarificationDraft,
                    evidence: JSON.stringify({ creditCode, rejectionRemarks }),
                    igbcInterpretation: "The reviewer's remarks do not align with the standard IGBC review criteria for this credit.",
                    risks: "Irrelevant or incorrect clarification request from reviewer.",
                    recommendations: "Double check the credit requirements or appeal the reviewer's remark."
                };
            }
            return {
                consultantAssessment: `**Clarification Response Draft for ${creditCode}:**\n\n${clarificationDraft}`,
                evidence: JSON.stringify({ creditCode, documentName, rejectionRemarks }),
                igbcInterpretation: `Clarification drafted for ${creditCode} based on reviewer remarks and IGBC review criteria.`,
                risks: "This is an AI draft — review before sending. Ensure all referenced documents are actually available.",
                recommendations: `Once finalized, upload the revised document and send the clarification response for ${creditCode}.`
            };
        });
    }
    static _callLLM(systemPrompt, contents) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
            const geminiKeys = env_1.env.geminiApiKeys || [];
            const groqKeys = env_1.env.groqApiKeys || [];
            const openaiKeys = env_1.env.openAiApiKeys || [];
            const userText = (_f = (_d = (_c = (_b = (_a = contents[0]) === null || _a === void 0 ? void 0 : _a.parts) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.text) !== null && _d !== void 0 ? _d : (_e = contents[0]) === null || _e === void 0 ? void 0 : _e.content) !== null && _f !== void 0 ? _f : "";
            for (const apiKey of geminiKeys) {
                for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
                    try {
                        const r = yield fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                            body: JSON.stringify({
                                systemInstruction: { parts: [{ text: systemPrompt }] },
                                contents,
                                generationConfig: { temperature: 0.3 }
                            })
                        });
                        if (!r.ok)
                            continue;
                        const d = yield r.json();
                        const text = (_l = (_k = (_j = (_h = (_g = d.candidates) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.content) === null || _j === void 0 ? void 0 : _j.parts) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.text;
                        if (text)
                            return text.trim();
                    }
                    catch ( /* try next */_t) { /* try next */ }
                }
            }
            for (const apiKey of groqKeys) {
                try {
                    const r = yield fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model: "llama-3.3-70b-versatile",
                            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }],
                            temperature: 0.3
                        })
                    });
                    if (!r.ok)
                        continue;
                    const d = yield r.json();
                    const text = (_p = (_o = (_m = d.choices) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.message) === null || _p === void 0 ? void 0 : _p.content;
                    if (text)
                        return text.trim();
                }
                catch ( /* try next */_u) { /* try next */ }
            }
            for (const apiKey of openaiKeys) {
                try {
                    const r = yield fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }],
                            temperature: 0.3
                        })
                    });
                    if (!r.ok)
                        continue;
                    const d = yield r.json();
                    const text = (_s = (_r = (_q = d.choices) === null || _q === void 0 ? void 0 : _q[0]) === null || _r === void 0 ? void 0 : _r.message) === null || _s === void 0 ? void 0 : _s.content;
                    if (text)
                        return text.trim();
                }
                catch ( /* try next */_v) { /* try next */ }
            }
            return "Unable to draft clarification — all LLM providers are temporarily unavailable. Please try again.";
        });
    }
}
exports.ClarificationAssistanceEngine = ClarificationAssistanceEngine;
