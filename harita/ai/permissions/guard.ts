import { getAIActionContract } from "@/ai/actions/contracts";

export function canExecuteAIAction(role: string, actionId: string): boolean {
  const contract = getAIActionContract(actionId);
  if (!contract) return false;
  return contract.allowed_roles.includes(role);
}
