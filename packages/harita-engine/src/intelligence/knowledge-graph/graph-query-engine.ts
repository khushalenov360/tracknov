import { GraphRepository } from "./repositories/graph-repository";
import { GraphRelationship } from "./types/graph-edge";
import { GraphNodeType } from "./types/graph-types";

export class GraphQueryEngine {
  public static queryOwnership(projectId: string, creditId: string): string[] {
    const graph = GraphRepository.getGraph(projectId);
    const owners = new Set<string>();
    
    for (const [id, edge] of graph.edges) {
      if (edge.sourceId === creditId && edge.relationship === GraphRelationship.ASSIGNED_TO) {
        const target = graph.nodes.get(edge.targetId);
        if (target) owners.add(target.label);
      } else if (edge.relationship === GraphRelationship.ASSIGNED_TO) {
        // Recursive check for requirements
        for (const [innerId, innerEdge] of graph.edges) {
          if (innerEdge.sourceId === creditId && innerEdge.targetId === edge.sourceId) {
             const target = graph.nodes.get(edge.targetId);
             if (target) owners.add(target.label);
          }
        }
      }
    }
    return Array.from(owners);
  }

  public static queryAssignments(projectId: string, creditId: string): { requirementType: string, contributorName: string }[] {
    const graph = GraphRepository.getGraph(projectId);
    const assignments: { requirementType: string, contributorName: string }[] = [];
    
    for (const [id, edge] of graph.edges) {
      if (edge.sourceId === creditId && edge.relationship === GraphRelationship.ASSIGNED_TO) {
        const target = graph.nodes.get(edge.targetId);
        if (target) assignments.push({ requirementType: "Overall Credit", contributorName: target.label });
      } else if (edge.relationship === GraphRelationship.ASSIGNED_TO) {
        // Recursive check for requirements
        for (const [innerId, innerEdge] of graph.edges) {
          if (innerEdge.sourceId === creditId && innerEdge.targetId === edge.sourceId) {
             const target = graph.nodes.get(edge.targetId);
             const reqNode = graph.nodes.get(edge.sourceId);
             if (target && reqNode) {
               assignments.push({ requirementType: reqNode.label, contributorName: target.label });
             }
          }
        }
      }
    }
    return assignments;
  }

  public static queryMissingEvidence(projectId: string, creditId: string): string[] {
    const graph = GraphRepository.getGraph(projectId);
    const missing = new Set<string>();
    
    for (const [id, edge] of graph.edges) {
      if (edge.sourceId === creditId && edge.relationship === GraphRelationship.REQUIRES) {
        const reqNode = graph.nodes.get(edge.targetId);
        let hasDoc = false;
        for (const [innerId, docEdge] of graph.edges) {
          if (docEdge.targetId === edge.targetId && docEdge.relationship === GraphRelationship.SATISFIES) {
            hasDoc = true;
          }
        }
        if (!hasDoc && reqNode) missing.add(reqNode.label);
      }
    }
    return Array.from(missing);
  }

  public static queryRecommendations(projectId: string, creditId: string): string[] {
    const missing = this.queryMissingEvidence(projectId, creditId);
    return missing.map(m => `Upload ${m}`);
  }

  public static queryDecisions(projectId: string): string[] {
    const graph = GraphRepository.getGraph(projectId);
    const decisions: string[] = [];
    for (const [id, node] of graph.nodes) {
      if (node.type === GraphNodeType.DECISION) {
        decisions.push(node.label);
      }
    }
    return decisions;
  }
}
