import { CertificationKnowledgeGraph, type KnowledgeNode } from "./graphBuilder";

export function findReusableEvidence(graph: CertificationKnowledgeGraph, creditId: string): KnowledgeNode[] {
  return graph
    .getRelatedNodes(creditId)
    .filter((node) => {
      const category = String(node.data?.category ?? node.type ?? "").toLowerCase();
      return category.includes("evidence") || category.includes("document");
    });
}
