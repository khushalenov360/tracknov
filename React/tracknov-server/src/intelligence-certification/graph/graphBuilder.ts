export type KnowledgeNode = {
  id: string;
  type?: string;
  data: Record<string, any>;
};

export class CertificationKnowledgeGraph {
  private readonly nodes = new Map<string, KnowledgeNode>();
  private readonly edges = new Map<string, Set<string>>();

  constructor(seedNodes: KnowledgeNode[] = []) {
    seedNodes.forEach((node) => this.addNode(node));
  }

  addNode(node: KnowledgeNode) {
    this.nodes.set(node.id, node);
  }

  addEdge(fromId: string, toId: string) {
    const existing = this.edges.get(fromId) ?? new Set<string>();
    existing.add(toId);
    this.edges.set(fromId, existing);
  }

  getNode(nodeId: string) {
    return this.nodes.get(nodeId) ?? null;
  }

  getRelatedNodes(nodeId: string) {
    const linked = this.edges.get(nodeId);
    if (!linked) {
      return [];
    }

    return Array.from(linked)
      .map((relatedId) => this.nodes.get(relatedId))
      .filter((node): node is KnowledgeNode => Boolean(node));
  }
}
