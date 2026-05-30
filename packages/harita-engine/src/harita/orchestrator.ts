import { resolveHaritaMode, HaritaIntent } from "./router/resolveHaritaMode";
import { buildWorkflowContext } from "./context/buildWorkflowContext";
import { WorkflowResponseSchema, FallbackResponseSchema } from "./contracts/workflow";
import { generateDeterministicFallback } from "./fallbacks/deterministicFallback";
import { aiService } from "../services/ai-service";
import { createClient } from "../supabase/server";

export type HaritaRequest = {
  query: string;
  projectId?: string;
  intentHint?: HaritaIntent;
  history?: any[];
};

/**
 * The Authoritative Orchestrator for the EnovAIT Modeled Harita.
 * This is the high-level entry point that coordinates routing, context building,
 * and deterministic output enforcement.
 */
export async function orchestrateHaritaResponse(request: HaritaRequest) {
  const { query, projectId, intentHint } = request;
  
  // 1. Resolve Mode
  const intent = intentHint || "unknown"; // TODO: Use a classifier to refine this
  const mode = resolveHaritaMode(intent);

  if (mode === "conversation") {
    // Normal conversation logic (can still use legacy assistant path)
    return { mode: "conversation", query };
  }

  // 2. Workflow Mode Execution
  if (!projectId) {
    return generateDeterministicFallback("hallucination_detected", "Project context is missing for this workflow action.");
  }

  // 3. Build Context
  const context = await buildWorkflowContext(projectId);
  if (!context) {
    return generateDeterministicFallback("unauthorized", "You do not have access to this project's workflow data.");
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
  } catch (error) {
    return generateDeterministicFallback("schema_invalid");
  }
}
