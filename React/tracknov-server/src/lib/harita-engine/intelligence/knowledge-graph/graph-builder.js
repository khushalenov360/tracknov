"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphBuilder = void 0;
const graph_types_1 = require("./types/graph-types");
const graph_edge_1 = require("./types/graph-edge");
class GraphBuilder {
    static buildFromRuntimeContext(projectId, runtimeContext) {
        var _a, _b;
        const graph = { nodes: new Map(), edges: new Map() };
        let edgeCounter = 1;
        const addEdge = (sourceId, targetId, relationship) => {
            const edgeId = `e${edgeCounter++}`;
            graph.edges.set(edgeId, { id: edgeId, sourceId, targetId, relationship });
        };
        if (runtimeContext.project) {
            graph.nodes.set(projectId, { id: projectId, type: graph_types_1.GraphNodeType.PROJECT, label: runtimeContext.project.name || "Project", metadata: runtimeContext.project });
        }
        if (runtimeContext.credits) {
            for (const credit of runtimeContext.credits) {
                const creditId = credit.id || credit.credit_code;
                graph.nodes.set(creditId, { id: creditId, type: graph_types_1.GraphNodeType.CREDIT, label: credit.credit_code, metadata: credit });
            }
        }
        if (runtimeContext.profiles) {
            for (const [userId, profile] of Object.entries(runtimeContext.profiles || {})) {
                const p = profile;
                graph.nodes.set(userId, { id: userId, type: graph_types_1.GraphNodeType.CONTRIBUTOR, label: p.full_name || userId, metadata: p });
            }
        }
        if (runtimeContext.creditAssignmentGraph) {
            for (const [creditId, assignmentGraph] of runtimeContext.creditAssignmentGraph.entries()) {
                const assignments = assignmentGraph.assignments || [];
                for (const assignment of assignments) {
                    const reqId = `${creditId}_REQ_${assignment.doc_type}`;
                    if (!graph.nodes.has(reqId)) {
                        graph.nodes.set(reqId, { id: reqId, type: graph_types_1.GraphNodeType.REQUIREMENT, label: assignment.doc_type, metadata: { creditId } });
                        addEdge(creditId, reqId, graph_edge_1.GraphRelationship.REQUIRES);
                    }
                    if (assignment.assigned_to) {
                        addEdge(reqId, assignment.assigned_to, graph_edge_1.GraphRelationship.ASSIGNED_TO);
                    }
                }
            }
        }
        if (runtimeContext.documents) {
            for (const doc of runtimeContext.documents) {
                const docId = doc.id;
                graph.nodes.set(docId, { id: docId, type: graph_types_1.GraphNodeType.DOCUMENT, label: doc.name || doc.file_name, metadata: doc });
                // Link document to credit if applicable
                if (doc.doc_category) {
                    const creditMatch = (_a = runtimeContext.credits) === null || _a === void 0 ? void 0 : _a.find((c) => c.credit_code === doc.doc_category);
                    if (creditMatch) {
                        const creditId = creditMatch.id || creditMatch.credit_code;
                        addEdge(docId, creditId, graph_edge_1.GraphRelationship.SUPPORTS);
                        if (doc.doc_type) {
                            const reqId = `${creditId}_REQ_${doc.doc_type}`;
                            addEdge(docId, reqId, graph_edge_1.GraphRelationship.SATISFIES);
                        }
                    }
                }
            }
        }
        // Additional Intelligence Nodes for Project Context
        if (runtimeContext.project) {
            // Certification Target
            const certNodeId = `CERT_${projectId}`;
            graph.nodes.set(certNodeId, { id: certNodeId, type: graph_types_1.GraphNodeType.CERTIFICATION, label: "Gold Certification Target", metadata: {} });
            addEdge(projectId, certNodeId, graph_edge_1.GraphRelationship.REQUIRES);
            // Link rejected docs to certification impact
            if (runtimeContext.documents) {
                for (const doc of runtimeContext.documents) {
                    if (doc.state === "REJECTED") {
                        // Rejected Drawing -> Blocks Credit
                        const creditMatch = (_b = runtimeContext.credits) === null || _b === void 0 ? void 0 : _b.find((c) => c.credit_code === doc.doc_category);
                        if (creditMatch) {
                            const creditId = creditMatch.id || creditMatch.credit_code;
                            addEdge(doc.id, creditId, graph_edge_1.GraphRelationship.BLOCKS);
                            // Credit -> Affects Certification
                            addEdge(creditId, certNodeId, graph_edge_1.GraphRelationship.AFFECTS_CERTIFICATION);
                            // Readiness risk
                            const riskNodeId = `RISK_${creditId}`;
                            if (!graph.nodes.has(riskNodeId)) {
                                graph.nodes.set(riskNodeId, { id: riskNodeId, type: graph_types_1.GraphNodeType.RISK, label: `Readiness Risk: ${creditMatch.credit_code}`, metadata: {} });
                                addEdge(creditId, riskNodeId, graph_edge_1.GraphRelationship.CONTRIBUTES_TO);
                            }
                        }
                    }
                }
            }
        }
        return graph;
    }
}
exports.GraphBuilder = GraphBuilder;
