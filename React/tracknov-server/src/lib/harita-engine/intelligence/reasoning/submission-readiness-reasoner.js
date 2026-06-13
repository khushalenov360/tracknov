"use strict";
// ============================================================
// SubmissionReadinessReasoner
// ============================================================
// Routes SUBMISSION_READINESS intents through EvidenceAssessmentEngine.
//
// Trigger query examples:
//   "Can EDA C1 be submitted today?"
//   "Is EDA C1 ready for submission?"
//   "Assess evidence for WE C1"
//
// Pipeline:
//   1. Extract credit code from query
//   2. Resolve credit ID from knowledge_credit table
//   3. Find most recently uploaded project document for that credit
//   4. Parse the document content (stored as extracted_text in DB)
//   5. Run EvidenceAssessmentEngine.assess()
//   6. Format output as ReasoningOutput
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
exports.SubmissionReadinessReasoner = void 0;
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
const evidence_assessment_engine_1 = require("../evidence/evidence-assessment-engine");
class SubmissionReadinessReasoner {
    static evaluate(query, projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const supabase = (0, admin_1.createAdminClient)();
            // ── 1. Extract credit code ────────────────────────────────────────────────
            const creditMatch = query.match(/([a-zA-Z]{2,3}\s*C\d+)/i);
            const creditCode = creditMatch ? creditMatch[1].toUpperCase().replace(/\s+/, " ") : null;
            if (!creditCode) {
                return {
                    consultantAssessment: "Please specify a credit code (e.g. EDA C1) to assess submission readiness.",
                    evidence: "No credit code found in query.",
                    igbcInterpretation: "Evidence assessment requires a specific credit reference.",
                    risks: "None",
                    recommendations: "Try: 'Can EDA C1 be submitted today?'"
                };
            }
            // ── 2. Resolve credit ID ──────────────────────────────────────────────────
            const { data: credit, error: creditErr } = yield supabase
                .from("knowledge_credit")
                .select("id, code, title")
                .eq("code", creditCode)
                .maybeSingle();
            if (creditErr || !credit) {
                return {
                    consultantAssessment: `Credit ${creditCode} was not found in the Knowledge Repository.`,
                    evidence: `DB error: ${(creditErr === null || creditErr === void 0 ? void 0 : creditErr.message) || "not found"}`,
                    igbcInterpretation: "Only credits defined in the knowledge ontology can be assessed.",
                    risks: "Unrecognized credit code.",
                    recommendations: `Verify the credit code. Common codes: EDA C1, WE C1, MR C1.`
                };
            }
            // Check if the credit is marked as NA (Not Applicable / Not Required) for the project
            const { data: projCredit } = yield supabase
                .from("project_credits")
                .select("na")
                .eq("project_id", projectId)
                .ilike("credit_code", creditCode)
                .maybeSingle();
            if (projCredit === null || projCredit === void 0 ? void 0 : projCredit.na) {
                return {
                    consultantAssessment: `No. ${creditCode} is marked as Not Required (Not Applicable) for this project, so it is excluded from submission.`,
                    evidence: JSON.stringify({ creditCode, projectId, na: true }),
                    igbcInterpretation: `${creditCode} is not applicable to the current project scope.`,
                    risks: "None (Credit is NA)",
                    recommendations: "No action required. This credit is excluded from the project's certification score."
                };
            }
            // ── 3. Find latest uploaded document for this credit ─────────────────────
            const { data: docs } = yield supabase
                .from("project_documents")
                .select("id, file_name, doc_category, extracted_text, state, created_at")
                .eq("project_id", projectId)
                .eq("doc_category", creditCode)
                .order("created_at", { ascending: false })
                .limit(5);
            // ── 4. Determine parsed content ───────────────────────────────────────────
            let documentName = "(no document uploaded)";
            let parsedContent = "";
            if (docs && docs.length > 0) {
                // Use the most recent document that has extracted text
                const withText = docs.find((d) => d.extracted_text && d.extracted_text.trim().length > 0);
                const target = withText || docs[0];
                documentName = target.file_name || documentName;
                parsedContent = target.extracted_text || "";
            }
            if (!parsedContent) {
                // No uploaded document — return a structured "no evidence" response
                return {
                    consultantAssessment: `No. There are no uploaded documents for ${creditCode} yet.`,
                    evidence: JSON.stringify({ creditCode, projectId, documentsFound: (docs === null || docs === void 0 ? void 0 : docs.length) || 0 }),
                    igbcInterpretation: `${creditCode} cannot be submitted without supporting evidence documents.`,
                    risks: "Zero evidence uploaded. Credit is blocked.",
                    recommendations: `Upload the required documents for ${creditCode}. Check 'What documents are required for ${creditCode}?' to see the list.`
                };
            }
            // ── 5. Run Evidence Assessment Engine ─────────────────────────────────────
            const geminiApiKey = ((_a = env_1.env.geminiApiKeys) === null || _a === void 0 ? void 0 : _a[0]) || "";
            const groqApiKey = ((_b = env_1.env.groqApiKeys) === null || _b === void 0 ? void 0 : _b[0]) || "";
            const openaiApiKey = ((_c = env_1.env.openAiApiKeys) === null || _c === void 0 ? void 0 : _c[0]) || "";
            const assessment = yield evidence_assessment_engine_1.EvidenceAssessmentEngine.assess(supabase, { geminiApiKey, groqApiKey, openaiApiKey }, credit.id, documentName, parsedContent);
            // ── 6. Format ReasoningOutput ─────────────────────────────────────────────
            const canSubmit = assessment.readinessState === "Ready";
            const missingList = assessment.missingEvidence.map(e => `  ✗ ${e}`).join("\n");
            const foundList = assessment.evidenceFound.map(e => `  ✓ ${e}`).join("\n");
            const weakList = assessment.weakEvidence.length > 0
                ? `\n\nWeak Evidence:\n${assessment.weakEvidence.map(e => `  ⚠ ${e}`).join("\n")}`
                : "";
            const consultantAssessment = canSubmit
                ? `Yes. ${creditCode} is Ready for submission.\n\nEvidence Strength: ${assessment.strengthScore}%\nReadiness: ${assessment.readinessState}`
                : `No.\n\nMissing:\n${missingList || "  (none listed)"}\n\nEvidence Strength: ${assessment.strengthScore}%\nReadiness: ${assessment.readinessState}\n\nRecommended Action: ${assessment.recommendedAction}`;
            return {
                consultantAssessment,
                evidence: JSON.stringify({
                    documentAnalyzed: documentName,
                    detectedType: assessment.detectedType,
                    mappedCredit: assessment.mappedCredit,
                    evidenceFound: assessment.evidenceFound,
                    missingEvidence: assessment.missingEvidence,
                    weakEvidence: assessment.weakEvidence,
                    strengthScore: assessment.strengthScore,
                    readinessState: assessment.readinessState,
                }),
                igbcInterpretation: `Evidence assessment sourced from ontology criteria for ${creditCode}. ${assessment.evidenceFound.length} evidence items found, ${assessment.missingEvidence.length} missing.`,
                risks: assessment.missingEvidence.length > 0
                    ? `Missing evidence: ${assessment.missingEvidence.join(", ")}`
                    : "No blocking evidence gaps.",
                recommendations: assessment.recommendedAction
            };
        });
    }
}
exports.SubmissionReadinessReasoner = SubmissionReadinessReasoner;
