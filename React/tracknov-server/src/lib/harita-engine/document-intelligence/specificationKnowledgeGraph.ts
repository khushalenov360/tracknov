/**
 * Tracknov Document Intelligence - Specification Knowledge Graph
 * Structures technical parameters into a graph for cross-document engineering constraint check.
 */

export interface GraphNode {
  id: string;
  label: string;
  type: "EQUIPMENT" | "PARAMETER" | "DOCUMENT";
  properties: Record<string, string>;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  type: "DEPICTS" | "DEPENDS_ON" | "COMPLIES_WITH";
}

export class SpecificationKnowledgeGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];

  public addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  public addEdge(edge: GraphEdge): void {
    this.edges.push(edge);
  }

  public getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  public getEdges(): GraphEdge[] {
    return this.edges;
  }

  /**
   * Identifies all direct dependencies for a given node.
   */
  public getDependencies(nodeId: string): GraphNode[] {
    const dependencies: GraphNode[] = [];
    
    for (const edge of this.edges) {
      if (edge.sourceId === nodeId && edge.type === "DEPENDS_ON") {
        const target = this.nodes.get(edge.targetId);
        if (target) dependencies.push(target);
      }
    }

    return dependencies;
  }
}
