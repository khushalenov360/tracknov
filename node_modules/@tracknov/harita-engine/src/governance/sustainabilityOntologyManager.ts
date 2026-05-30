/**
 * Tracknov Knowledge Governance - Sustainability Ontology Manager
 * Orchestrates growth, validation, and tags structure for Framework ESG taxonomies.
 */

export interface OntologyNode {
  code: string;
  name: string;
  description: string;
  parentCode?: string;
  rigorWeight: number;
}

export class SustainabilityOntologyManager {
  private static ontologyNodes: Map<string, OntologyNode> = new Map();

  static {
    // Bootstrap core IGBC energy and water taxonomy nodes
    const initialNodes: OntologyNode[] = [
      { code: "EE", name: "Energy Efficiency", description: "IGBC Energy performance optimization limits", rigorWeight: 1.2 },
      { code: "EE-C1", name: "Chiller Efficiency", description: "Coefficient of performance thresholds", parentCode: "EE", rigorWeight: 1.5 },
      { code: "WE", name: "Water Efficiency", description: "Indoor and outdoor water usage reduction standards", rigorWeight: 1.0 },
      { code: "MR", name: "Materials and Resources", description: "Recycled content and regional sourcing", rigorWeight: 0.9 }
    ];

    initialNodes.forEach(node => this.ontologyNodes.set(node.code, node));
  }

  public static getNode(code: string): OntologyNode | null {
    return this.ontologyNodes.get(code) || null;
  }

  public static listNodes(): OntologyNode[] {
    return Array.from(this.ontologyNodes.values());
  }

  public static addNode(node: OntologyNode, authorRole: string): boolean {
    if (authorRole !== "super_admin" && authorRole !== "L5_GOVERNOR") {
      return false;
    }
    this.ontologyNodes.set(node.code, node);
    return true;
  }
}
