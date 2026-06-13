"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveHaritaMode = resolveHaritaMode;
/**
 * Resolves the Harita mode based on the detected intent.
 * Follows the EnovAIT Modeled Harita Architecture law.
 */
function resolveHaritaMode(intent) {
    const workflowIntents = [
        "upload",
        "assign",
        "approve",
        "validate",
        "map_document",
    ];
    if (workflowIntents.includes(intent)) {
        return "workflow";
    }
    return "conversation";
}
