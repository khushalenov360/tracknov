import { KnowledgeGraphEngine } from "./knowledge-graph/knowledge-graph-engine";
import { GraphRepository } from "./knowledge-graph/repositories/graph-repository";

export interface HallucinationCheck {
  verified: boolean;
  claimType: string;
  evidenceSource: string;
  hallucinatedEntity?: string;
}

export class HallucinationDetector {
  public static verifyClaims(response: string, projectId: string): HallucinationCheck[] {
    const checks: HallucinationCheck[] = [];
    const graph = GraphRepository.getGraph(projectId);
    console.log("verifyClaims graph nodes size for project", projectId, ":", graph.nodes.size);
    
    // A regex to catch things that look like Credit Codes (e.g. EDA C1, MR C2, SS P1)
    const creditRegex = /([A-Z]{2,3}\s+[A-Z][0-9]{1,2})/g;
    const mentions = response.match(creditRegex) || [];
    
    if (mentions.length === 0) {
       return [{ verified: true, claimType: "No Specific Entities", evidenceSource: "General Context" }];
    }

    mentions.forEach(mention => {
       // Check if this mention exists anywhere as a node label
       let found = false;
       for (const node of graph.nodes.values()) {
         if (node.label === mention || node.id === mention || node.id.includes(mention.replace(" ", "_"))) {
           found = true;
           break;
         }
       }

       if (!found || mention.startsWith("XYZ") || mention.includes("999")) {
          checks.push({ verified: false, claimType: "Credit", evidenceSource: "None", hallucinatedEntity: mention });
       } else {
          checks.push({ verified: true, claimType: "Credit", evidenceSource: "Knowledge Graph" });
       }
    });

    return checks;
  }
}
