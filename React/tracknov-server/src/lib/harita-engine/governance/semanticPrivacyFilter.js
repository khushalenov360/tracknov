"use strict";
/**
 * Tracknov Knowledge Governance - Semantic Privacy Filter
 * Filters private strings or credentials from vector query spaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticPrivacyFilter = void 0;
class SemanticPrivacyFilter {
    /**
     * Cleans vector search fields to suppress potential credentials leakage.
     */
    static filterPrivateTerms(query) {
        let cleanQuery = query;
        for (const term of this.BLACKLIST_TERMS) {
            const regex = new RegExp(term, "gi");
            cleanQuery = cleanQuery.replace(regex, "[FILTERED]");
        }
        return cleanQuery;
    }
}
exports.SemanticPrivacyFilter = SemanticPrivacyFilter;
SemanticPrivacyFilter.BLACKLIST_TERMS = [
    "secret",
    "password",
    "apikey",
    "token",
    "invoice-id",
    "client-name"
];
