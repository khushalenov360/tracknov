/**
 * Tracknov Knowledge Governance - Intelligence Lineage Tracker
 * Mapped lineage nodes to track how adjustments propagate through versions.
 */

export type IntelligenceLineageNode = {
  id: string;
  parentNodes: string[];
  influencedBy: string[];
  benchmarkVersion: string;
  semanticVersion: string;
  replayHash: string;
};

export class IntelligenceLineageTracker {
  private static lineageGraph: Map<string, IntelligenceLineageNode> = new Map();

  static {
    // Seed bootstrap lineage tracking node
    this.lineageGraph.set("node-root", {
      id: "node-root",
      parentNodes: [],
      influencedBy: ["bootstrap-correction"],
      benchmarkVersion: "v1.0",
      semanticVersion: "1.0.0",
      replayHash: "HASH-BOOTSTRAP-INTEGRITY"
    });
  }

  public static trackAdjustment(
    parentVersion: string,
    semanticVersion: string,
    influencedBy: string[],
    benchmarkVersion: string,
    replayHash: string
  ): IntelligenceLineageNode {
    const id = `node-${Math.random().toString(36).substr(2, 9)}`;
    const node: IntelligenceLineageNode = {
      id,
      parentNodes: [parentVersion],
      influencedBy,
      benchmarkVersion,
      semanticVersion,
      replayHash
    };
    this.lineageGraph.set(id, node);
    return node;
  }

  public static getLineage(id: string): IntelligenceLineageNode | null {
    return this.lineageGraph.get(id) || null;
  }

  public static listLineageNodes(): IntelligenceLineageNode[] {
    return Array.from(this.lineageGraph.values());
  }
}
