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
exports.orchestrateHaritaResponse = orchestrateHaritaResponse;
const resolveHaritaMode_1 = require("./router/resolveHaritaMode");
const buildWorkflowContext_1 = require("./context/buildWorkflowContext");
const deterministicFallback_1 = require("./fallbacks/deterministicFallback");
/**
 * The Authoritative Orchestrator for the EnovAIT Modeled Harita.
 * This is the high-level entry point that coordinates routing, context building,
 * and deterministic output enforcement.
 */
function orchestrateHaritaResponse(request) {
    return __awaiter(this, void 0, void 0, function* () {
        const { query, projectId, intentHint } = request;
        // 1. Resolve Mode
        const intent = intentHint || "unknown"; // TODO: Use a classifier to refine this
        const mode = (0, resolveHaritaMode_1.resolveHaritaMode)(intent);
        if (mode === "conversation") {
            // Normal conversation logic (can still use legacy assistant path)
            return { mode: "conversation", query };
        }
        // 2. Workflow Mode Execution
        if (!projectId) {
            return (0, deterministicFallback_1.generateDeterministicFallback)("hallucination_detected", "Project context is missing for this workflow action.");
        }
        // 3. Build Context
        const context = yield (0, buildWorkflowContext_1.buildWorkflowContext)(projectId);
        if (!context) {
            return (0, deterministicFallback_1.generateDeterministicFallback)("unauthorized", "You do not have access to this project's workflow data.");
        }
        try {
            // 4. Call AI with Structured Contract Prompting
            // For now, we simulate or wrap the existing AI service call
            // In a real implementation, we would use a system prompt that enforces the Zod schema.
            // TODO: Implement structured prompt execution
            // This is where we tell the AI: "You MUST return JSON matching this schema..."
            return {
                mode: "workflow",
                intent,
                context,
                message: "Orchestrator ready. (Phase 3 foundation active)"
            };
        }
        catch (error) {
            return (0, deterministicFallback_1.generateDeterministicFallback)("schema_invalid");
        }
    });
}
