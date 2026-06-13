"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationPluginValidator = void 0;
class IntegrationPluginValidator {
    /**
     * Performs static code verification to ensure sandboxed isolation compliance
     */
    static validatePluginStructure(code) {
        const issues = [];
        if (code.includes("XMLHttpRequest") || code.includes("fetch(")) {
            issues.push("Unauthorized network request detected (must rely on tenant-scoped boundaries).");
        }
        if (code.includes("window.location") || code.includes("localStorage")) {
            issues.push("Unauthorized browser storage manipulation detected.");
        }
        return {
            valid: issues.length === 0,
            issues
        };
    }
}
exports.IntegrationPluginValidator = IntegrationPluginValidator;
