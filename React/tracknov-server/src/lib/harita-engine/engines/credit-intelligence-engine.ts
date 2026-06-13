import { RuntimeContext, CreditRow } from "../lib/runtime/runtime-context-assembler";

export class CreditIntelligenceEngine {
  public static evaluateCredit(creditId: string, context: RuntimeContext) {
    const credit = context.credits.find(c => c.id === creditId);
    if (!credit) throw new Error("Credit not found in context");
    
    const graph = context.creditAssignmentGraph.get(creditId);
    const hasAssignments = graph && graph.requirements.length > 0;
    const requirementsMet = credit.status === 'complete' || credit.status === 'APPROVED';

    return {
      creditCode: credit.credit_code,
      status: credit.status,
      actionable: !hasAssignments || requirementsMet,
      missingTasks: graph?.requirements.map(r => r.requirementType) || []
    };
  }
}
