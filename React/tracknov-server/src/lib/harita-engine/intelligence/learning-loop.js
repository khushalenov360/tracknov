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
exports.learningLoopService = void 0;
const pdf_extractor_1 = require("@/lib/harita-engine/services/pdf-extractor");
const admin_1 = require("@/lib/supabase/admin");
exports.learningLoopService = {
    /**
     * Ingests an official IGBC Clarification Request (CR) or rejection PDF.
     * Leverages Headroom's `learn` module to parse the rejection logic and isolate failure parameters.
     */
    ingestRejectionPdf(buffer, projectId, creditId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawText = yield (0, pdf_extractor_1.extractTextFromPdf)(buffer);
            // TODO: Send to Headroom `learn` endpoint via MCP or CLI to parse rejection logic
            // Placeholder logic for demonstration
            const isolatedFailureParameter = this.mockHeadroomLearnExtraction(rawText);
            const newRule = `CR CONSTRAINT [Project ${projectId} / Credit ${creditId}]: ${isolatedFailureParameter}`;
            // Inject rule into the specific project's configuration context in the database
            // This maintains multi-tenant isolation, ensuring one project's CRs don't leak into another.
            yield this.injectRuleIntoProjectContext(projectId, creditId, newRule);
            return {
                extractedRules: [newRule],
                injectedPromptParams: newRule,
            };
        });
    },
    mockHeadroomLearnExtraction(text) {
        // In a real scenario, headroom parse isolates: "The chiller COP submitted does not match the baseline schedule."
        if (text.toLowerCase().includes("chiller")) {
            return "Ensure all chiller COP values strictly match the MEP baseline schedule format.";
        }
        return "Ensure calculation sheets are explicitly attached with vendor submittals.";
    },
    injectRuleIntoProjectContext(projectId, creditId, ruleText) {
        return __awaiter(this, void 0, void 0, function* () {
            const adminClient = (0, admin_1.createAdminClient)();
            // Store the learned rule in the database so it's injected into the prompt context dynamically
            // when assembleRuntimeContext is called for this specific project.
            yield adminClient.from("project_learned_rules").insert({
                project_id: projectId,
                credit_id: creditId,
                rule_text: ruleText,
                source: "igbc_rejection_pdf",
            });
            console.log(`[LEARNING LOOP] Injected new rule for project ${projectId}: ${ruleText}`);
        });
    }
};
