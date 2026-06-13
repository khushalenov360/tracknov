"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackResponseSchema = exports.WorkflowResponseSchema = exports.UIActionSchema = void 0;
const zod_1 = require("zod");
/**
 * Authoritative UI Action schema.
 * Harita returns these to be rendered as deterministic buttons/controls.
 */
exports.UIActionSchema = zod_1.z.object({
    label: zod_1.z.string(),
    action: zod_1.z.enum([
        "confirm_upload",
        "confirm_assignment",
        "confirm_approval",
        "confirm_rejection",
        "request_clarification",
        "view_document",
        "retry_validation",
    ]),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    variant: zod_1.z.enum(["primary", "secondary", "danger", "ghost"]).default("primary"),
});
/**
 * Structured Workflow Response Contract.
 * Mandatory for all WORKFLOW mode responses.
 */
exports.WorkflowResponseSchema = zod_1.z.object({
    intent: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    ui_actions: zod_1.z.array(exports.UIActionSchema),
    workflow_context: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    validation_state: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    requires_confirmation: zod_1.z.boolean().default(false),
    message: zod_1.z.string().optional(), // Brief status message (not conversational negotiation)
});
/**
 * Fallback response schema for invalid AI outputs.
 */
exports.FallbackResponseSchema = zod_1.z.object({
    status: zod_1.z.literal("fallback"),
    message: zod_1.z.string().default("Unable to safely determine workflow action."),
    error_type: zod_1.z.string().optional(),
});
