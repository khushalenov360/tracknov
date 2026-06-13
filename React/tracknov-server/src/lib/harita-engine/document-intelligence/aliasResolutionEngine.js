"use strict";
/**
 * Tracknov Extraction Feedback - Alias Resolution Engine
 * Maps custom project nomenclature variants to standard parameters.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AliasResolutionEngine = void 0;
class AliasResolutionEngine {
    /**
     * Translates descriptive text aliases into canonical parameter keys.
     */
    static resolveAlias(alias) {
        if (!alias)
            return "UNKNOWN";
        const clean = alias.toLowerCase().trim();
        return this.ALIAS_MAP[clean] || alias.toUpperCase();
    }
}
exports.AliasResolutionEngine = AliasResolutionEngine;
AliasResolutionEngine.ALIAS_MAP = {
    "lighting power density": "LPD",
    "lighting density": "LPD",
    "lpd limit": "LPD",
    "coefficient of performance": "COP",
    "chiller efficiency": "COP",
    "efficiency target": "COP",
    "volatile organic compound": "VOC",
    "voc limit": "VOC",
    "indoor air quality": "IAQ",
    "chilled water flow": "PRIMARY_FLOW",
    "water flow": "PRIMARY_FLOW"
};
