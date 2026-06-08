import { KnowledgeGraphEngine } from "./knowledge-graph/knowledge-graph-engine";

export interface ProjectContext { projectId: string; health: string; }
export interface AssignmentGraph { assignments: any[]; }
export interface EvidenceGraph { evidence: any[]; missing: any[]; }
export interface CertificationProjection { rating: string; points: number; readiness: number; }
export interface MemoryContext { memories: any[]; decisions: any[]; }

export interface ConsultantContext {
  projectContext: ProjectContext;
  assignmentContext: AssignmentGraph;
  evidenceContext: EvidenceGraph;
  certificationContext: CertificationProjection;
  memoryContext: MemoryContext;
  graphMetrics?: any;
}

export class ConsultantOrchestrator {
  public static coordinateContext(projectId: string): ConsultantContext {
    // Phase 1 KG Integration: Build & Refresh the Knowledge Graph
    KnowledgeGraphEngine.refreshGraph(projectId, {});
    const metrics = KnowledgeGraphEngine.getGraphMetrics(projectId);

    return {
      projectContext: { projectId, health: "GOOD" },
      assignmentContext: { assignments: [] },
      evidenceContext: { evidence: [], missing: [] },
      certificationContext: { rating: "Gold", points: 75, readiness: 60 },
      memoryContext: { memories: [], decisions: [] },
      graphMetrics: metrics
    };
  }

  // Future-proof planner stubs
  public static findDependencies(creditId: string) { return []; }
  public static findOwners(creditId: string) { return KnowledgeGraphEngine.queryGraph("").queryOwnership("", creditId); }
  public static findBlockers(creditId: string) { return []; }
  public static findRisks(creditId: string) { return []; }
  public static findEvidence(creditId: string) { return []; }
  public static findRecommendations(creditId: string) { return KnowledgeGraphEngine.queryGraph("").queryRecommendations("", creditId); }
}
