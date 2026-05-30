import { executeIntent } from "@/ai/orchestrator/execute-intent";
import { getWorkspaceSnapshot } from "@/lib/harita/context/getWorkspaceSnapshot";
import { EnovAitBoundary } from "@/lib/api/enovaitApiBoundary";
import { haritaRuntimeService } from "@/lib/services/harita-runtime-service";
import { getProjectIdFromContext } from "@/lib/harita/context/getProjectIdFromContext";

/**
 * Validates the intelligence intent boundary against the EnovAIT policy.
 */
export function validateEnovAitBoundary(intentCategory: string) {
  EnovAitBoundary.validateIntelligenceRequest("/api/assistant", "POST", { action: intentCategory });
}

/**
 * Handles explicit workflow intent dispatching.
 */
export async function dispatchWorkflowIntent(
  userId: string,
  role: string,
  focusedProjectId: string,
  projectName: string | null,
  prompt: string
) {
  return await executeIntent({
    userId,
    role,
    projectContext: {
      projectId: focusedProjectId,
      projectName: projectName ?? null,
    },
    query: prompt,
  });
}
