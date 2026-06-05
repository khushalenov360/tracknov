import { GraphCache } from "./graph-cache";
import { GraphBuilder } from "./graph-builder";
import { GraphRepository } from "./repositories/graph-repository";
import { GraphInvalidator } from "./graph-invalidator";
import { GraphQueryEngine } from "./graph-query-engine";

export class KnowledgeGraphEngine {
  public static buildGraph(projectId: string, runtimeContext: any) {
    const graph = GraphBuilder.buildFromRuntimeContext(projectId, runtimeContext);
    GraphRepository.saveGraph(projectId, graph);
    GraphCache.set(projectId, graph);
    return graph;
  }

  public static refreshGraph(projectId: string, runtimeContext: any) {
    GraphInvalidator.invalidateProject(projectId);
    return this.buildGraph(projectId, runtimeContext);
  }

  public static queryGraph(projectId: string) {
    return GraphQueryEngine;
  }

  public static invalidateGraph(projectId: string) {
    GraphInvalidator.invalidateProject(projectId);
  }

  public static getGraphMetrics(projectId: string) {
    const graph = GraphRepository.getGraph(projectId);
    return {
      nodeCount: graph.nodes.size,
      edgeCount: graph.edges.size,
      creditCount: Array.from(graph.nodes.values()).filter(n => n.type === "CREDIT").length,
      documentCount: Array.from(graph.nodes.values()).filter(n => n.type === "DOCUMENT").length,
      riskCount: Array.from(graph.nodes.values()).filter(n => n.type === "RISK").length,
    };
  }
}
