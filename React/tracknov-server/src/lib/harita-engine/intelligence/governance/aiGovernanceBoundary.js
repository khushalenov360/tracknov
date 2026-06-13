"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiGovernanceBoundary = void 0;
/**
 * TRACKNOV AI GOVERNANCE BOUNDARY
 *
 * Enforces the strict "Advisory Only" law for all AI operations.
 */
class AiGovernanceBoundary {
    /**
     * Validates that an AI recommendation does not attempt to mutate authoritative state.
     */
    static validateRecommendation(action, payload) {
        const forbiddenActions = [
            "APPROVE_CREDIT",
            "REJECT_CREDIT",
            "MUTATE_STATE",
            "BYPASS_VALIDATION",
            "SET_SCORING"
        ];
        if (forbiddenActions.includes(action)) {
            throw new Error(`GOVERNANCE_VIOLATION: AI attempted authoritative action '${action}'. AI remains advisory only.`);
        }
        // Ensure payload doesn't contain state-mutation flags
        if ((payload === null || payload === void 0 ? void 0 : payload.authoritative) === true || (payload === null || payload === void 0 ? void 0 : payload.skipValidation) === true) {
            throw new Error(`GOVERNANCE_VIOLATION: AI attempted to bypass validation or set authoritative flags.`);
        }
        return true;
    }
    /**
     * Ensures framework isolation by checking that recommendations match the project's framework.
     */
    static validateFrameworkAlignment(recommendationFramework, projectFramework) {
        if (recommendationFramework !== projectFramework) {
            throw new Error(`FRAMEWORK_ISOLATION_VIOLATION: AI recommended ${recommendationFramework} logic for a ${projectFramework} project.`);
        }
        return true;
    }
}
exports.AiGovernanceBoundary = AiGovernanceBoundary;
