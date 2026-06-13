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
exports.generateReviewerBrief = generateReviewerBrief;
const aiRuntimeAuditLogger_1 = require("@/lib/core/telemetry/aiRuntimeAuditLogger");
/**
 * TRACKNOV AI REVIEWER ASSIST ENGINE
 *
 * Provides high-level summaries and workflow guidance for reviewers.
 */
function generateReviewerBrief(projectId, reviewerId) {
    return __awaiter(this, void 0, void 0, function* () {
        const brief = {
            summary: "Project is 60% complete. 3 credits pending review. No high-risk blockers identified.",
            suggestedNextActions: [
                "Review SS-1 Submittal (Uploaded 2h ago)",
                "Check clarification response for WE-2"
            ],
            priorityRating: "MEDIUM"
        };
        yield (0, aiRuntimeAuditLogger_1.logAiRecommendation)({
            projectId,
            recommendationType: "REVIEWER_BRIEF",
            payload: brief,
            reasoning: "Automated daily briefing for reviewer focus."
        });
        return brief;
    });
}
