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
exports.validateEnovAitBoundary = validateEnovAitBoundary;
exports.dispatchWorkflowIntent = dispatchWorkflowIntent;
const execute_intent_1 = require("@/ai/orchestrator/execute-intent");
const enovaitApiBoundary_1 = require("@/lib/core/api/enovaitApiBoundary");
/**
 * Validates the intelligence intent boundary against the EnovAIT policy.
 */
function validateEnovAitBoundary(intentCategory) {
    enovaitApiBoundary_1.EnovAitBoundary.validateIntelligenceRequest("/api/assistant", "POST", { action: intentCategory });
}
/**
 * Handles explicit workflow intent dispatching.
 */
function dispatchWorkflowIntent(userId, role, focusedProjectId, projectName, prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, execute_intent_1.executeIntent)({
            userId,
            role,
            projectContext: {
                projectId: focusedProjectId,
                projectName: projectName !== null && projectName !== void 0 ? projectName : null,
            },
            query: prompt,
        });
    });
}
