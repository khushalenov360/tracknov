import { GraphNode, GraphEdge, KnowledgeGraphData } from "../types/graph-node";

export class GraphRepository {
  private static storage = new Map<string, KnowledgeGraphData>();

  public static getGraph(projectId: string): KnowledgeGraphData {
    if (!this.storage.has(projectId)) {
      this.storage.set(projectId, { nodes: new Map(), edges: new Map() });
    }
    return this.storage.get(projectId)!;
  }

  public static saveGraph(projectId: string, graph: KnowledgeGraphData) {
    this.storage.set(projectId, graph);
  }

  public static saveNode(projectId: string, node: GraphNode) {
    const graph = this.getGraph(projectId);
    graph.nodes.set(node.id, node);
  }

  public static saveEdge(projectId: string, edge: GraphEdge) {
    const graph = this.getGraph(projectId);
    graph.edges.set(edge.id, edge);
  }

  public static deleteNode(projectId: string, nodeId: string) {
    const graph = this.getGraph(projectId);
    graph.nodes.delete(nodeId);
  }

  public static deleteEdge(projectId: string, edgeId: string) {
    const graph = this.getGraph(projectId);
    graph.edges.delete(edgeId);
  }
}
