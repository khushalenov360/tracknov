"use strict";
/**
 * Tracknov Knowledge Governance - Canonical Conflict Resolver
 * Detects and mitigates overlapping semantic mappings or conflicting unit/manufacturer definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanonicalConflictResolver = void 0;
class CanonicalConflictResolver {
    /**
     * Evaluates overlapping aliases and produces a single unified canonical target.
     */
    static resolveConflict(termA, termB, category) {
        const lowerA = termA.toLowerCase().trim();
        const lowerB = termB.toLowerCase().trim();
        if (lowerA === lowerB) {
            return {
                resolved: true,
                resolvedValue: termA,
                strategy: "IDENTITY_COLLAPSE",
                timestamp: new Date().toISOString()
            };
        }
        // Resolve Manufacturer aliases (e.g. Carrier vs Carrier Corp)
        if (category === "MANUFACTURER") {
            if (lowerA.includes(lowerB)) {
                return {
                    resolved: true,
                    resolvedValue: termB, // Prefer shorter canonical name
                    strategy: "SUBSTRING_MERGE",
                    timestamp: new Date().toISOString()
                };
            }
            else if (lowerB.includes(lowerA)) {
                return {
                    resolved: true,
                    resolvedValue: termA,
                    strategy: "SUBSTRING_MERGE",
                    timestamp: new Date().toISOString()
                };
            }
        }
        // Default to strict manual reconciliation block
        return {
            resolved: false,
            resolvedValue: "",
            strategy: "MANUAL_RECONCILIATION_REQUIRED",
            timestamp: new Date().toISOString()
        };
    }
}
exports.CanonicalConflictResolver = CanonicalConflictResolver;
