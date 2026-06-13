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
exports.EvidenceAssessmentEngine = void 0;
const headroom_ai_1 = require("headroom-ai");
function buildSystemPrompt(creditCode, requiredSubmission, requiredReview) {
    return `You are Harita, the IGBC Certification Consultant AI.
You are running the Evidence Assessment Engine.

Credit Code: ${creditCode}

Required Submission Criteria (what the project team must provide):
${requiredSubmission}

Required Review Criteria (what IGBC reviewers will check for):
${requiredReview}

Analyze the Document Content strictly against the above criteria. Extract concrete evidence items found.
Determine what is missing, what is weak/ambiguous, and whether anything appears duplicated.

Score the evidence 0-100:
  - Completeness: how many required items are clearly present (50%)
  - Coverage: how thoroughly each item is addressed (30%)
  - Consistency: whether figures are internally consistent (20%)

Return EXACTLY a valid JSON object (no markdown, no extra text):
{
  "detectedType": "Drawing | Calculation | Narrative | Photo | Specification | Invoice | Other",
  "evidenceFound": ["..."],
  "missingEvidence": ["..."],
  "weakEvidence": ["..."],
  "duplicateEvidence": ["..."],
  "strengthScore": 0,
  "readinessState": "Ready | Partially Ready | Not Ready",
  "recommendedAction": "..."
}`;
}
function parseJsonResponse(text) {
    try {
        const clean = text.replace(/```json|```/g, "").trim();
        return JSON.parse(clean);
    }
    catch (_a) {
        return null;
    }
}
class EvidenceAssessmentEngine {
    /**
     * Assess evidence in a parsed document for a specific IGBC credit.
     *
     * @param supabase      Authenticated Supabase client (admin).
     * @param clients       LLM API keys — at least one must be present.
     * @param creditId      UUID of the knowledge_credit row.
     * @param documentName  Original filename (for display).
     * @param parsedContent Extracted text from DocumentParser.
     */
    static assess(supabase, clients, creditId, documentName, parsedContent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            // ── 1. Fetch criteria from the ontology ──────────────────────────────────
            const [{ data: submissionCriteria }, { data: reviewCriteria }, { data: credit }] = yield Promise.all([
                supabase.from("knowledge_submission_criteria").select("description").eq("credit_id", creditId),
                supabase.from("knowledge_review_criteria").select("description").eq("credit_id", creditId),
                supabase.from("knowledge_credit").select("code, title").eq("id", creditId).maybeSingle(),
            ]);
            const requiredSubmission = (submissionCriteria === null || submissionCriteria === void 0 ? void 0 : submissionCriteria.map((c) => `- ${c.description}`).join("\n")) || "No submission criteria found.";
            const requiredReview = (reviewCriteria === null || reviewCriteria === void 0 ? void 0 : reviewCriteria.map((c) => `- ${c.description}`).join("\n")) || "No review criteria found.";
            const creditCode = (credit === null || credit === void 0 ? void 0 : credit.code) || "Unknown";
            // ── 2. Prepare payload ───────────────────────────────────────────────────
            const systemPrompt = buildSystemPrompt(creditCode, requiredSubmission, requiredReview);
            const userMessage = `Document Name: ${documentName}\n\nDocument Content:\n${parsedContent}`;
            let geminiContents = [
                { role: "user", parts: [{ text: userMessage }] },
            ];
            // Headroom compression (graceful fallback)
            try {
                const cr = yield (0, headroom_ai_1.compress)(geminiContents, { model: "gemini-2.5-flash", fallback: true });
                geminiContents = cr.messages || geminiContents;
            }
            catch (_m) {
                // proceed uncompressed
            }
            // ── 3. Gemini provider ───────────────────────────────────────────────────
            if (clients.geminiApiKey) {
                for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
                    try {
                        const response = yield fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "x-goog-api-key": clients.geminiApiKey },
                            body: JSON.stringify({
                                systemInstruction: { parts: [{ text: systemPrompt }] },
                                contents: geminiContents,
                                generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
                            }),
                        });
                        if (!response.ok) {
                            console.warn(`[EvidenceAssessmentEngine] Gemini ${model} HTTP ${response.status}`);
                            continue;
                        }
                        const data = yield response.json();
                        const text = (_e = (_d = (_c = (_b = (_a = data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                        if (text) {
                            const parsed = parseJsonResponse(text);
                            if (parsed)
                                return EvidenceAssessmentEngine._build(parsed, creditCode);
                        }
                    }
                    catch (e) {
                        console.warn("[EvidenceAssessmentEngine] Gemini error:", e);
                    }
                }
            }
            // ── 4. Groq fallback ────────────────────────────────────────────────────
            if (clients.groqApiKey) {
                for (const model of ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]) {
                    try {
                        const response = yield fetch("https://api.groq.com/openai/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${clients.groqApiKey}`,
                            },
                            body: JSON.stringify({
                                model,
                                messages: [
                                    { role: "system", content: systemPrompt },
                                    { role: "user", content: userMessage },
                                ],
                                temperature: 0.1,
                                response_format: { type: "json_object" },
                            }),
                        });
                        if (!response.ok) {
                            console.warn(`[EvidenceAssessmentEngine] Groq ${model} HTTP ${response.status}`);
                            continue;
                        }
                        const data = yield response.json();
                        const text = (_h = (_g = (_f = data.choices) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.message) === null || _h === void 0 ? void 0 : _h.content;
                        if (text) {
                            const parsed = parseJsonResponse(text);
                            if (parsed)
                                return EvidenceAssessmentEngine._build(parsed, creditCode);
                        }
                    }
                    catch (e) {
                        console.warn("[EvidenceAssessmentEngine] Groq error:", e);
                    }
                }
            }
            // ── 5. OpenAI fallback ───────────────────────────────────────────────────
            if (clients.openaiApiKey) {
                try {
                    const response = yield fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${clients.openaiApiKey}`,
                        },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: userMessage },
                            ],
                            temperature: 0.1,
                            response_format: { type: "json_object" },
                        }),
                    });
                    if (response.ok) {
                        const data = yield response.json();
                        const text = (_l = (_k = (_j = data.choices) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.message) === null || _l === void 0 ? void 0 : _l.content;
                        if (text) {
                            const parsed = parseJsonResponse(text);
                            if (parsed)
                                return EvidenceAssessmentEngine._build(parsed, creditCode);
                        }
                    }
                }
                catch (e) {
                    console.warn("[EvidenceAssessmentEngine] OpenAI error:", e);
                }
            }
            // ── 6. All providers exhausted ───────────────────────────────────────────
            return {
                detectedType: "Unknown",
                mappedCredit: creditCode,
                evidenceFound: [],
                missingEvidence: ["All LLM providers unavailable — please retry shortly"],
                weakEvidence: [],
                duplicateEvidence: [],
                strengthScore: 0,
                readinessState: "Not Ready",
                recommendedAction: "LLM providers are temporarily unavailable. Please retry.",
            };
        });
    }
    static _build(parsed, creditCode) {
        return {
            detectedType: parsed.detectedType || "Unknown",
            mappedCredit: creditCode,
            evidenceFound: Array.isArray(parsed.evidenceFound) ? parsed.evidenceFound : [],
            missingEvidence: Array.isArray(parsed.missingEvidence) ? parsed.missingEvidence : [],
            weakEvidence: Array.isArray(parsed.weakEvidence) ? parsed.weakEvidence : [],
            duplicateEvidence: Array.isArray(parsed.duplicateEvidence) ? parsed.duplicateEvidence : [],
            strengthScore: typeof parsed.strengthScore === "number" ? parsed.strengthScore : 0,
            readinessState: parsed.readinessState || "Not Ready",
            recommendedAction: parsed.recommendedAction || "Review document",
        };
    }
}
exports.EvidenceAssessmentEngine = EvidenceAssessmentEngine;
