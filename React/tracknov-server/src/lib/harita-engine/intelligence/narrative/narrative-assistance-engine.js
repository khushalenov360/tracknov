"use strict";
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
exports.NarrativeAssistanceEngine = void 0;
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
const headroom_ai_1 = require("headroom-ai");
class NarrativeAssistanceEngine {
    static draft(query, runtimeContext) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            const supabase = (0, admin_1.createAdminClient)();
            // ── 1. Extract credit code from query ────────────────────────────────
            const creditMatch = query.match(/([a-zA-Z]{2,3}\s*C\d+)/i);
            const creditCode = (_b = (_a = creditMatch === null || creditMatch === void 0 ? void 0 : creditMatch[1]) === null || _a === void 0 ? void 0 : _a.toUpperCase().replace(/\s+/, " ")) !== null && _b !== void 0 ? _b : null;
            if (!creditCode) {
                return {
                    consultantAssessment: "Please specify a credit code so I can draft the narrative. For example: 'Write a narrative for EDA C1'.",
                    evidence: "No credit code detected in query.",
                    igbcInterpretation: "Narrative drafts are credit-specific.",
                    risks: "None",
                    recommendations: "Specify a credit code like EDA C1, WE C1, MR C1."
                };
            }
            // ── 2. Fetch credit + criteria from ontology ─────────────────────────
            const { data: credit } = yield supabase
                .from("knowledge_credit")
                .select("id, code, title, description")
                .eq("code", creditCode)
                .maybeSingle();
            if (!credit) {
                return {
                    consultantAssessment: `Credit ${creditCode} was not found in the Knowledge Repository.`,
                    evidence: "Credit not found.",
                    igbcInterpretation: "Only known IGBC credits can have narratives drafted.",
                    risks: "Unknown credit.",
                    recommendations: `Verify the credit code. Use 'What documents are required for ${creditCode}?' to check if it exists.`
                };
            }
            const { data: reviewCriteria } = yield supabase
                .from("knowledge_review_criteria")
                .select("description")
                .eq("credit_id", credit.id);
            const { data: submissionCriteria } = yield supabase
                .from("knowledge_submission_criteria")
                .select("description")
                .eq("credit_id", credit.id);
            const criteria = [
                ...((reviewCriteria === null || reviewCriteria === void 0 ? void 0 : reviewCriteria.map((r) => `- ${r.description}`)) || []),
                ...((submissionCriteria === null || submissionCriteria === void 0 ? void 0 : submissionCriteria.map((s) => `- ${s.description}`)) || []),
            ].join("\n") || "No criteria seeded for this credit.";
            // ── 3. Fetch evidence from project_document ─────────────────────────
            const projectId = (_c = runtimeContext === null || runtimeContext === void 0 ? void 0 : runtimeContext.project) === null || _c === void 0 ? void 0 : _c.id;
            let evidenceText = "";
            if (projectId && projectId !== "unknown") {
                const { data: docs, error: docErr } = yield supabase
                    .from("project_document")
                    .select("file_name, document_intelligence_metrics(extracted_text)")
                    .eq("project_id", projectId)
                    .eq("doc_category", creditCode);
                if (docErr) {
                    console.error("NarrativeAssistanceEngine doc query error:", docErr);
                }
                if (!docs || docs.length === 0) {
                    return {
                        consultantAssessment: "Insufficient evidence available to generate compliant narrative.",
                        evidence: "No documents found for this credit.",
                        igbcInterpretation: "A narrative cannot be generated without supporting evidence.",
                        risks: "Missing evidence blocks narrative generation.",
                        recommendations: "Upload required evidence first."
                    };
                }
                docs.forEach((doc) => {
                    evidenceText += `Document: ${doc.file_name}\n`;
                    const intel = Array.isArray(doc.document_intelligence_metrics) ? doc.document_intelligence_metrics[0] : doc.document_intelligence_metrics;
                    if (intel && intel.extracted_text) {
                        evidenceText += `Extracted Content:\n${intel.extracted_text}\n\n`;
                    }
                    else {
                        evidenceText += `Extracted Content:\n(No extracted text available)\n\n`;
                    }
                });
                if (!evidenceText.includes("Extracted Content:\n") || evidenceText.includes("(No extracted text available)")) {
                    // Wait, the test expects "Insufficient evidence" if no text is present
                    if (!evidenceText.replace(/Document:.*?\n|Extracted Content:\n|\(No extracted text available\)\n\n/g, "").trim()) {
                        return {
                            consultantAssessment: "Insufficient evidence available to generate compliant narrative.",
                            evidence: "Uploaded documents have no extracted text.",
                            igbcInterpretation: "A narrative requires parsable evidence.",
                            risks: "Evidence is unreadable.",
                            recommendations: "Re-upload documents ensuring they contain readable text."
                        };
                    }
                }
            }
            else {
                return {
                    consultantAssessment: "Insufficient evidence available to generate compliant narrative.",
                    evidence: "Project context is missing.",
                    igbcInterpretation: "A narrative cannot be generated outside of a project context.",
                    risks: "Missing project context.",
                    recommendations: "Ensure you are within a valid project workspace."
                };
            }
            // ── 4. Build project context (if available) ──────────────────────────
            const projectName = (_e = (_d = runtimeContext === null || runtimeContext === void 0 ? void 0 : runtimeContext.project) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : "the project";
            const location = (_g = (_f = runtimeContext === null || runtimeContext === void 0 ? void 0 : runtimeContext.project) === null || _f === void 0 ? void 0 : _f.location) !== null && _g !== void 0 ? _g : "the project site";
            const systemPrompt = `You are Harita, the IGBC Certification Consultant AI.
Draft a professional compliance narrative for the IGBC credit below.

Credit Code: ${creditCode}
Credit Title: ${credit.title}
Credit Description: ${credit.description || "N/A"}

Review and Submission Criteria:
${criteria}

Project Context:
- Project Name: ${projectName}
- Location: ${location}

Available Evidence Content:
${evidenceText}

Instructions:
- Write a clear, professional narrative of 3-5 paragraphs
- Begin with an overview statement of design intent
- Address each criterion explicitly using ONLY the information provided in the "Available Evidence Content".
- You MUST NOT invent or hallucinate any numbers, calculations, percentages, or facts that are not explicitly stated in the evidence.
- If a criterion requires data that is missing from the evidence, do NOT mention that criterion or state that it is not addressed.
- Do NOT include placeholder brackets — write actual content based on the project context
- Keep it factual, avoiding unsupported claims
`;
            let geminiContents = [
                { role: "user", parts: [{ text: `Draft a submission narrative for IGBC credit ${creditCode}: ${credit.title}.` }] }
            ];
            try {
                const cr = yield (0, headroom_ai_1.compress)(geminiContents, { model: "gemini-2.5-flash", fallback: true });
                geminiContents = cr.messages || geminiContents;
            }
            catch ( /* ignore */_m) { /* ignore */ }
            // ── 4. Call LLM ───────────────────────────────────────────────────────
            const narrative = yield NarrativeAssistanceEngine._callLLM(systemPrompt, geminiContents);
            return {
                consultantAssessment: narrative,
                evidence: JSON.stringify({ creditCode, criteriaCount: ((_h = reviewCriteria === null || reviewCriteria === void 0 ? void 0 : reviewCriteria.length) !== null && _h !== void 0 ? _h : 0) + ((_j = submissionCriteria === null || submissionCriteria === void 0 ? void 0 : submissionCriteria.length) !== null && _j !== void 0 ? _j : 0) }),
                igbcInterpretation: `Narrative drafted for ${creditCode} based on ${((_k = reviewCriteria === null || reviewCriteria === void 0 ? void 0 : reviewCriteria.length) !== null && _k !== void 0 ? _k : 0) + ((_l = submissionCriteria === null || submissionCriteria === void 0 ? void 0 : submissionCriteria.length) !== null && _l !== void 0 ? _l : 0)} ontology criteria.`,
                risks: "Narrative is AI-generated — validate against actual project documents before submission.",
                recommendations: `Review and customize the narrative, then upload it as a Narrative document for ${creditCode}.`
            };
        });
    }
    static _callLLM(systemPrompt, contents) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
            const geminiKeys = env_1.env.geminiApiKeys || [];
            const groqKeys = env_1.env.groqApiKeys || [];
            const openaiKeys = env_1.env.openAiApiKeys || [];
            // Gemini
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
                        const text = (_e = (_d = (_c = (_b = (_a = d.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                        if (text)
                            return text.trim();
                    }
                    catch ( /* try next */_z) { /* try next */ }
                }
            }
            // Groq
            for (const apiKey of groqKeys) {
                try {
                    const r = yield fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model: "llama-3.3-70b-versatile",
                            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: (_l = (_j = (_h = (_g = (_f = contents[0]) === null || _f === void 0 ? void 0 : _f.parts) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.text) !== null && _j !== void 0 ? _j : (_k = contents[0]) === null || _k === void 0 ? void 0 : _k.content) !== null && _l !== void 0 ? _l : "" }],
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
                catch ( /* try next */_0) { /* try next */ }
            }
            // OpenAI
            for (const apiKey of openaiKeys) {
                try {
                    const r = yield fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: (_v = (_t = (_s = (_r = (_q = contents[0]) === null || _q === void 0 ? void 0 : _q.parts) === null || _r === void 0 ? void 0 : _r[0]) === null || _s === void 0 ? void 0 : _s.text) !== null && _t !== void 0 ? _t : (_u = contents[0]) === null || _u === void 0 ? void 0 : _u.content) !== null && _v !== void 0 ? _v : "" }],
                            temperature: 0.3
                        })
                    });
                    if (!r.ok)
                        continue;
                    const d = yield r.json();
                    const text = (_y = (_x = (_w = d.choices) === null || _w === void 0 ? void 0 : _w[0]) === null || _x === void 0 ? void 0 : _x.message) === null || _y === void 0 ? void 0 : _y.content;
                    if (text)
                        return text.trim();
                }
                catch ( /* try next */_1) { /* try next */ }
            }
            return `Unable to generate narrative — all LLM providers are temporarily unavailable. Please try again shortly.`;
        });
    }
}
exports.NarrativeAssistanceEngine = NarrativeAssistanceEngine;
