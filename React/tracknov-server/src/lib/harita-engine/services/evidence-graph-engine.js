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
exports.evidenceGraphEngine = exports.EvidenceGraphEngine = void 0;
class EvidenceGraphEngine {
    buildGraph(document, credits) {
        // Finds the relationship between the document and credits
        const matchedCredits = credits.filter(c => document.doc_category === c.credit_code || document.credit_id === c.id);
        return {
            document: document.file_name,
            inferredEvidence: document.doc_category,
            mappedCredits: matchedCredits.map(c => ({
                creditCode: c.credit_code,
                points: c.points || 1,
                requirement: c.what_to_submit || "Standard requirement"
            }))
        };
    }
    generateContextString(document, credits) {
        if (!document)
            return "";
        const graph = this.buildGraph(document, credits);
        let str = `\n[EVIDENCE GRAPH ENGINE]\nActive Document: ${graph.document}\nInferred Evidence Type: ${graph.inferredEvidence}\nMapped Credits:\n`;
        if (graph.mappedCredits.length === 0) {
            str += "- No direct credits mapped yet.\n";
        }
        else {
            graph.mappedCredits.forEach(c => {
                str += `- ${c.creditCode} (${c.points} pts): Requires ${c.requirement}\n`;
            });
        }
        return str;
    }
    getToolSchema() {
        return {
            name: "evaluateEvidence",
            description: "Use this tool to semantically evaluate if a document meets a credit requirement. This runs an isolated cognitive loop to score the evidence.",
            parameters: {
                type: "OBJECT",
                properties: {
                    documentSummary: {
                        type: "STRING",
                        description: "The summary of the document's contents."
                    },
                    creditRequirement: {
                        type: "STRING",
                        description: "The detailed requirement of the credit."
                    }
                },
                required: ["documentSummary", "creditRequirement"]
            }
        };
    }
    evaluateEvidenceWithAI(documentSummary, creditRequirement, apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const systemPrompt = `You are the Tracknov Evidence Graph Engine.
Evaluate the document summary against the credit requirement.
Return a JSON object with two fields:
- confidenceScore (number 0-100): How likely is it that the document satisfies the requirement.
- reasoning (string): Brief justification.`;
            const body = {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: `Document Summary: ${documentSummary}\nCredit Requirement: ${creditRequirement}` }] }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                }
            };
            try {
                const res = yield fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
                if (!res.ok)
                    return { confidenceScore: 0, reasoning: "Evaluation failed" };
                const data = yield res.json();
                const text = (_e = (_d = (_c = (_b = (_a = data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                if (text) {
                    return JSON.parse(text);
                }
            }
            catch (_f) {
                // fallback
            }
            return { confidenceScore: 0, reasoning: "Failed to parse AI response" };
        });
    }
}
exports.EvidenceGraphEngine = EvidenceGraphEngine;
exports.evidenceGraphEngine = new EvidenceGraphEngine();
