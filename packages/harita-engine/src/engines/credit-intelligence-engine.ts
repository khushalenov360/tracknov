import { RuntimeContext, CreditRow } from "../lib/runtime/runtime-context-assembler";

export class CreditIntelligenceEngine {
  public static evaluateCredit(creditId: string, context: RuntimeContext) {
    const credit = context.credits.find(c => c.id === creditId);
    if (!credit) throw new Error("Credit not found in context");
    
    const graph = context.creditAssignmentGraph.get(creditId);
    const hasAssignments = graph && graph.requirements.length > 0;
    const requirementsMet = graph ? graph.requirements.every(r => r.status === 'complete' || r.status === 'APPROVED') : false;

    return {
      creditCode: credit.credit_code,
      status: credit.status,
      actionable: !hasAssignments || requirementsMet,
      missingTasks: graph?.requirements.filter(r => r.status !== 'complete').map(r => r.requirementType) || []
    };
  }
}
