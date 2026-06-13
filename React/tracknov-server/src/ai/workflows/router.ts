import { orchestrateHaritaResponse } from "@tracknov/harita-engine/harita/orchestrator";
import type { AIIntent } from "@/ai/intents/types";

export async function routeWorkflowAction(input: {
  intent: AIIntent;
  query: string;
  projectId?: string | null;
}) {
  if (!input.projectId) {
    return { ok: false, message: "Project context is required for workflow execution." };
  }
  const result = await orchestrateHaritaResponse({
    query: input.query,
    projectId: input.projectId,
    intentHint: "upload",
  });
  if ("status" in result && result.status === "fallback") {
    return { ok: false, message: result.message };
  }
  return { ok: true, message: "Workflow orchestration completed.", result };
}
