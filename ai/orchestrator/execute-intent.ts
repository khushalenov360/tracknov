import { getAIActionContract } from "@/ai/actions/contracts";
import { getOperationalContext } from "@/ai/context/operational-context";
import { resolveIntentFromPrompt } from "@/ai/intents/router";
import type { IntentExecutionRequest, IntentExecutionResult } from "@/ai/intents/types";
import { canExecuteAIAction } from "@/ai/permissions/guard";
import { routeWorkflowAction } from "@/ai/workflows/router";

export async function executeIntent(
  request: Omit<IntentExecutionRequest, "intent"> & { query: string },
): Promise<IntentExecutionResult> {
  const intent = resolveIntentFromPrompt(request.query);
  const contract = getAIActionContract(intent);

  if (intent === "general" || !contract) {
    return {
      ok: true,
      intent,
      message: "I can help with analysis, mapping suggestions, and workflow guidance from the current project context.",
      contract: null,
      nextSteps: ["Ask me to analyze a file", "Ask me to suggest likely credit mappings"],
    };
  }

  if (!canExecuteAIAction(request.role, intent)) {
    return {
      ok: false,
      intent,
      actionId: contract.action_id,
      contract: { action_id: contract.action_id, action_name: contract.action_name },
      message: "Your role is not allowed to execute this action.",
      nextSteps: ["Ask a Project Admin, Owner, or Super User to perform this action"],
    };
  }

  const operationalContext = await getOperationalContext(request.userId);
  void operationalContext;

  const workflowResult = await routeWorkflowAction({
    intent,
    query: request.query,
    projectId: request.projectContext.projectId ?? null,
  });

  return {
    ok: workflowResult.ok,
    intent,
    actionId: contract.action_id,
    contract: { action_id: contract.action_id, action_name: contract.action_name },
    message: workflowResult.message,
    nextSteps: workflowResult.ok
      ? ["Review the updated workflow state", "Proceed with the next required submission step"]
      : ["Check project context", "Retry with a specific workflow action command"],
  };
}
