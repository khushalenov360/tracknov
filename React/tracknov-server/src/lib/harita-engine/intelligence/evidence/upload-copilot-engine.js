"use strict";
// ============================================================
// UploadCopilotEngine
// ============================================================
// Called immediately after a document is parsed to give the
// contributor structured, consultant-grade upload guidance:
//
//   Detected:         Drawing
//   Mapped Credit:    EDA C1
//   Evidence Found:   ✓ Circulation Layout  ✓ Passage Width
//   Missing:          ✗ Area Statement  ✗ Occupancy Calculation
//   Strength:         60%
//   Readiness:        Partially Ready
//   Action:           Upload Area Statement next
//
// Combines DocumentClassifier + EvidenceMappingEngine +
// EvidenceAssessmentEngine into a single call.
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
exports.UploadCopilotEngine = void 0;
const evidence_assessment_engine_1 = require("../evidence/evidence-assessment-engine");
const evidence_mapping_engine_1 = require("../evidence/evidence-mapping-engine");
class UploadCopilotEngine {
    /**
     * Run the full upload copilot pipeline on a freshly parsed document.
     *
     * @param supabase         Admin Supabase client
     * @param llmClients       { geminiApiKey, groqApiKey, openaiApiKey }
     * @param filename         Original filename (e.g. "Layout.pdf")
     * @param evidenceType     Classified evidence type (e.g. "DRAWING")
     * @param parsedContent    Extracted text from DocumentParser
     * @param projectId        Optional project context for portfolio duplicate detection
     */
    static guide(supabase, llmClients, filename, evidenceType, parsedContent, projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            // ── 1. Map evidence type → credits + roles ───────────────────────────
            const mapping = yield evidence_mapping_engine_1.EvidenceMappingEngine.evaluate(evidenceType);
            const primaryCredit = (_b = (_a = mapping.suggestedCredits[0]) === null || _a === void 0 ? void 0 : _a.creditCode) !== null && _b !== void 0 ? _b : null;
            const primaryCreditId = (_d = (_c = mapping.suggestedCredits[0]) === null || _c === void 0 ? void 0 : _c.creditId) !== null && _d !== void 0 ? _d : null;
            const allCredits = mapping.suggestedCredits.map(c => c.creditCode);
            const responsibleRole = (_f = (_e = mapping.responsibleRoles[0]) === null || _e === void 0 ? void 0 : _e.roleName) !== null && _f !== void 0 ? _f : null;
            // ── 2. Run Evidence Assessment if we have a credit ───────────────────
            let assessment = null;
            if (primaryCreditId) {
                assessment = yield evidence_assessment_engine_1.EvidenceAssessmentEngine.assess(supabase, llmClients, primaryCreditId, filename, parsedContent);
            }
            // ── 3. Generate human-readable upload guidance ───────────────────────
            const guidance = UploadCopilotEngine._buildGuidance(filename, evidenceType, primaryCredit, allCredits, responsibleRole, assessment);
            return {
                filename,
                detectedType: evidenceType,
                primaryCredit,
                allSuggestedCredits: allCredits,
                responsibleRole,
                assessment,
                uploadGuidance: guidance,
            };
        });
    }
    static _buildGuidance(filename, evidenceType, primaryCredit, allCredits, responsibleRole, assessment) {
        const lines = [];
        lines.push(`📄 File Received: ${filename}`);
        lines.push(`\nDetected:\n  ${evidenceType}`);
        if (primaryCredit) {
            lines.push(`\nMapped Credit:\n  ${primaryCredit}`);
            if (allCredits.length > 1) {
                lines.push(`  Also satisfies: ${allCredits.slice(1).join(", ")}`);
            }
        }
        else {
            lines.push(`\nMapped Credit:\n  No credit mapping found for this evidence type.`);
        }
        if (responsibleRole) {
            lines.push(`\nResponsible Role:\n  ${responsibleRole}`);
        }
        if (assessment) {
            lines.push(`\nEvidence Found:`);
            if (assessment.evidenceFound.length) {
                assessment.evidenceFound.forEach(e => lines.push(`  ✓ ${e}`));
            }
            else {
                lines.push("  (none detected)");
            }
            lines.push(`\nMissing:`);
            if (assessment.missingEvidence.length) {
                assessment.missingEvidence.forEach(e => lines.push(`  ✗ ${e}`));
            }
            else {
                lines.push("  (none — document is complete)");
            }
            if (assessment.weakEvidence.length) {
                lines.push(`\nWeak Evidence:`);
                assessment.weakEvidence.forEach(e => lines.push(`  ⚠ ${e}`));
            }
            lines.push(`\nAssessment:\n  ${assessment.readinessState}`);
            lines.push(`\nReadiness:\n  ${assessment.strengthScore}%`);
            lines.push(`\nRecommended Action:\n  ${assessment.recommendedAction}`);
        }
        else {
            lines.push(`\nAssessment:\n  Unable to assess — credit mapping not found.`);
        }
        return lines.join("\n");
    }
}
exports.UploadCopilotEngine = UploadCopilotEngine;
