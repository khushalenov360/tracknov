export interface HaritaTool {
  name: string;
  description: string;
  execute: (args: any, context: any) => Promise<any>;
}

export const tools: Record<string, HaritaTool> = {
  updateTaskStatus: { name: "updateTaskStatus", description: "Updates task status", execute: async (args) => ({ success: true, args }) },
  reassignCredit: { name: "reassignCredit", description: "Reassign credit", execute: async (args) => ({ success: true, args }) },
  getProjectHealth: { name: "getProjectHealth", description: "Get project health", execute: async () => ({ health: "GOOD" }) },
  getCreditReadiness: { name: "getCreditReadiness", description: "Get credit readiness", execute: async () => ({ readiness: 68 }) },
  getEvidenceReadiness: { name: "getEvidenceReadiness", description: "Get evidence readiness", execute: async () => ({ confidence: 62 }) },
  getCertificationProjection: { name: "getCertificationProjection", description: "Get certification projection", execute: async () => ({ rating: "Gold" }) },
  getAssignmentGraph: { name: "getAssignmentGraph", description: "Get assignment graph", execute: async () => ({ assignments: [] }) },
  getContributorWorkload: { name: "getContributorWorkload", description: "Get workload", execute: async () => ({ tasksCount: 5 }) },
  getProjectRisks: { name: "getProjectRisks", description: "Get project risks", execute: async () => ({ risks: [] }) },
  getProjectRecommendations: { name: "getProjectRecommendations", description: "Get recommendations", execute: async () => ({ recommendations: [] }) },
  getCrossProjectPatterns: { name: "getCrossProjectPatterns", description: "Get cross project patterns", execute: async () => ({ patterns: [] }) }
};

export function getToolRegistry(): HaritaTool[] {
  return Object.values(tools);
}
