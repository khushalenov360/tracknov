import { z } from "zod";

/**
 * Authoritative UI Action schema.
 * Harita returns these to be rendered as deterministic buttons/controls.
 */
export const UIActionSchema = z.object({
  label: z.string(),
  action: z.enum([
    "confirm_upload",
    "confirm_assignment",
    "confirm_approval",
    "confirm_rejection",
    "request_clarification",
    "view_document",
    "retry_validation",
  ]),
  payload: z.record(z.string(), z.any()).optional(),
  variant: z.enum(["primary", "secondary", "danger", "ghost"]).default("primary"),
});

export type UIAction = z.infer<typeof UIActionSchema>;

/**
 * Structured Workflow Response Contract.
 * Mandatory for all WORKFLOW mode responses.
 */
export const WorkflowResponseSchema = z.object({
  intent: z.string(),
  confidence: z.number().min(0).max(1),
  ui_actions: z.array(UIActionSchema),
  workflow_context: z.record(z.string(), z.any()).optional(),
  validation_state: z.record(z.string(), z.any()).optional(),
  requires_confirmation: z.boolean().default(false),
  message: z.string().optional(), // Brief status message (not conversational negotiation)
});

export type WorkflowResponse = z.infer<typeof WorkflowResponseSchema>;

/**
 * Fallback response schema for invalid AI outputs.
 */
export const FallbackResponseSchema = z.object({
  status: z.literal("fallback"),
  message: z.string().default("Unable to safely determine workflow action."),
  error_type: z.string().optional(),
});

export type FallbackResponse = z.infer<typeof FallbackResponseSchema>;
