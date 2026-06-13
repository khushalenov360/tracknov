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
exports.draftClarification = draftClarification;
const uuid_1 = require("uuid");
const admin_1 = require("@/lib/supabase/admin");
const aiRuntimeAuditLogger_1 = require("@/lib/core/telemetry/aiRuntimeAuditLogger");
const aiPromptContextBuilder_1 = require("../../document-intelligence/aiPromptContextBuilder");
/**
 * TRACKNOV AI CLARIFICATION DRAFTING ENGINE
 *
 * Drafts professional clarifications for reviewers.
 */
function draftClarification(projectId, submittalId, issueSummary) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        const context = yield (0, aiPromptContextBuilder_1.buildPromptContext)(projectId, "SYSTEM");
        // Simulate drafting
        const draft = `
    Dear Applicant, 
    Regarding submittal ${submittalId}, please provide additional calculations for solar reflectance index (SRI). 
    Current evidence lacks the specific material coefficients required by ${context.framework}.
  `.trim();
        // Log draft recommendation
        yield (0, aiRuntimeAuditLogger_1.logAiRecommendation)({
            projectId,
            recommendationType: "CLARIFICATION_DRAFT",
            payload: { submittalId, draft, issueSummary },
            reasoning: "Reviewer flagged missing SRI calculations."
        });
        // Store in database for reviewer review
        const { data, error } = yield admin.from("ai_clarification_drafts").insert({
            project_id: projectId,
            submittal_id: submittalId,
            draft_content: draft,
            status: "draft",
            trace_id: (0, uuid_1.v4)(),
            causality_chain_id: (0, uuid_1.v4)()
        }).select().single();
        if (error)
            throw error;
        return data;
    });
}
