import { GraphNodeType } from "./types/graph-types";
import { GraphRelationship } from "./types/graph-edge";
import { KnowledgeGraphData } from "./types/graph-node";

export class GraphBuilder {
  public static buildFromRuntimeContext(projectId: string, runtimeContext: any): KnowledgeGraphData {
    const graph: KnowledgeGraphData = { nodes: new Map(), edges: new Map() };
    let edgeCounter = 1;

    const addEdge = (sourceId: string, targetId: string, relationship: GraphRelationship) => {
      const edgeId = `e${edgeCounter++}`;
      graph.edges.set(edgeId, { id: edgeId, sourceId, targetId, relationship });
    };

    if (runtimeContext.project) {
      graph.nodes.set(projectId, { id: projectId, type: GraphNodeType.PROJECT, label: runtimeContext.project.name || "Project", metadata: runtimeContext.project });
    }

    if (runtimeContext.credits) {
      for (const credit of runtimeContext.credits) {
        const creditId = credit.id || credit.credit_code;
        graph.nodes.set(creditId, { id: creditId, type: GraphNodeType.CREDIT, label: credit.credit_code, metadata: credit });
      }
    }

    if (runtimeContext.profiles) {
      for (const [userId, profile] of Object.entries(runtimeContext.profiles || {})) {
        const p = profile as any;
        graph.nodes.set(userId, { id: userId, type: GraphNodeType.CONTRIBUTOR, label: p.full_name || userId, metadata: profile });
      }
    }

    if (runtimeContext.creditAssignmentGraph) {
       for (const [creditId, assignmentGraph] of (runtimeContext.creditAssignmentGraph as Map<string, any>).entries()) {
          const assignments = assignmentGraph.assignments || [];
          for (const assignment of assignments) {
             const reqId = `${creditId}_REQ_${assignment.doc_type}`;
             if (!graph.nodes.has(reqId)) {
                graph.nodes.set(reqId, { id: reqId, type: GraphNodeType.REQUIREMENT, label: assignment.doc_type, metadata: { creditId } });
                addEdge(creditId, reqId, GraphRelationship.REQUIRES);
             }

             if (assignment.assigned_to) {
                addEdge(reqId, assignment.assigned_to, GraphRelationship.ASSIGNED_TO);
             }
          }
       }
    }

    if (runtimeContext.documents) {
      for (const doc of runtimeContext.documents) {
        const docId = doc.id;
        graph.nodes.set(docId, { id: docId, type: GraphNodeType.DOCUMENT, label: doc.name || doc.file_name, metadata: doc });
        
        // Link document to credit if applicable
        if (doc.doc_category) {
           const creditMatch = runtimeContext.credits?.find((c: any) => c.credit_code === doc.doc_category);
           if (creditMatch) {
             const creditId = creditMatch.id || creditMatch.credit_code;
             addEdge(docId, creditId, GraphRelationship.SUPPORTS);
             
             if (doc.doc_type) {
                const reqId = `${creditId}_REQ_${doc.doc_type}`;
                addEdge(docId, reqId, GraphRelationship.SATISFIES);
             }
           }
        }
      }
    }

    // Additional Intelligence Nodes for Project Context
    if (runtimeContext.project) {
      // Certification Target
      const certNodeId = `CERT_${projectId}`;
      graph.nodes.set(certNodeId, { id: certNodeId, type: GraphNodeType.CERTIFICATION, label: "Gold Certification Target", metadata: {} });
      addEdge(projectId, certNodeId, GraphRelationship.REQUIRES);
      
      // Link rejected docs to certification impact
      if (runtimeContext.documents) {
        for (const doc of runtimeContext.documents) {
          if (doc.state === "REJECTED") {
            // Rejected Drawing -> Blocks Credit
            const creditMatch = runtimeContext.credits?.find((c: any) => c.credit_code === doc.doc_category);
            if (creditMatch) {
              const creditId = creditMatch.id || creditMatch.credit_code;
              addEdge(doc.id, creditId, GraphRelationship.BLOCKS);
              // Credit -> Affects Certification
              addEdge(creditId, certNodeId, GraphRelationship.AFFECTS_CERTIFICATION);
              
              // Readiness risk
              const riskNodeId = `RISK_${creditId}`;
              if (!graph.nodes.has(riskNodeId)) {
                graph.nodes.set(riskNodeId, { id: riskNodeId, type: GraphNodeType.RISK, label: `Readiness Risk: ${creditMatch.credit_code}`, metadata: {} });
                addEdge(creditId, riskNodeId, GraphRelationship.CONTRIBUTES_TO);
              }
            }
          }
        }
      }
    }

    return graph;
  }
}
