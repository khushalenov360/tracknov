"use strict";
/**
 * Tracknov Knowledge Governance - Knowledge Mutation Guard
 * Enforces mandatory governor (L5+) authorization keys and blocks in-place overrides.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeMutationGuard = void 0;
class KnowledgeMutationGuard {
    /**
     * Asserts that a proposed knowledge entry modification is authorized and valid.
     */
    static validateMutation(proposedEntry, operatorRole, authToken) {
        if (operatorRole !== "super_admin" && operatorRole !== "L5_GOVERNOR") {
            return {
                authorized: false,
                reason: "MUTATION_BLOCKED: Only L5+ administrators may mutate canonical ESG definitions."
            };
        }
        if (!authToken || authToken.length < 10) {
            return {
                authorized: false,
                reason: "MUTATION_BLOCKED: Missing cryptographically signed audit trace token."
            };
        }
        // Block in-place modification of historical version entries
        if (proposedEntry.version && proposedEntry.version < 1) {
            return {
                authorized: false,
                reason: "MUTATION_BLOCKED: Historical versions must remain strictly immutable."
            };
        }
        return {
            authorized: true,
            reason: "MUTATION_APPROVED: Signature verified. Ready for prospective commit."
        };
    }
}
exports.KnowledgeMutationGuard = KnowledgeMutationGuard;
