"use strict";
/**
 * Tracknov Extraction Feedback - Specification Canonicalizer
 * Maps engineering spec properties to standardized value structures.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecificationCanonicalizer = void 0;
class SpecificationCanonicalizer {
    /**
     * Translates raw specification inputs into standardized canonical objects.
     */
    static canonicalizeSpec(paramName, rawValue) {
        const cleanParam = (paramName || "").toUpperCase().trim();
        const cleanVal = (rawValue || "").toUpperCase().trim();
        // 1. COP Efficiency Normalization
        if (cleanParam === "COP" || cleanParam === "EER" || cleanParam === "EFFICIENCY") {
            const match = cleanVal.match(/-?\d+(\.\d+)?/);
            if (match) {
                return {
                    rawValue,
                    canonicalValue: `${match[0]} COP`,
                    confidenceScore: 0.98,
                    normalizationType: "EFFICIENCY"
                };
            }
        }
        // 2. Lighting Power Density (LPD) Normalization
        if (cleanParam === "LPD" || cleanParam === "LIGHTING" || cleanParam === "LPD_LIMIT") {
            const match = cleanVal.match(/-?\d+(\.\d+)?/);
            if (match) {
                return {
                    rawValue,
                    canonicalValue: `${match[0]} W/sq.ft`,
                    confidenceScore: 0.98,
                    normalizationType: "LIGHTING_POWER"
                };
            }
        }
        // 3. Flow rate normalization
        if (cleanParam === "FLOW" || cleanParam === "FLOW_RATE" || cleanParam === "PRIMARY_FLOW") {
            const match = cleanVal.match(/-?\d+(\.\d+)?/);
            if (match) {
                return {
                    rawValue,
                    canonicalValue: `${match[0]} gpm`,
                    confidenceScore: 0.98,
                    normalizationType: "FLUID_FLOW"
                };
            }
        }
        return {
            rawValue,
            canonicalValue: rawValue,
            confidenceScore: 0.85,
            normalizationType: "GENERAL"
        };
    }
}
exports.SpecificationCanonicalizer = SpecificationCanonicalizer;
