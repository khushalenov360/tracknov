"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQueryEngine = void 0;
const graph_repository_1 = require("./repositories/graph-repository");
const graph_edge_1 = require("./types/graph-edge");
const graph_types_1 = require("./types/graph-types");
class GraphQueryEngine {
    static queryOwnership(projectId, creditId) {
        const graph = graph_repository_1.GraphRepository.getGraph(projectId);
        const owners = new Set();
        for (const [id, edge] of graph.edges) {
            if (edge.sourceId === creditId && edge.relationship === graph_edge_1.GraphRelationship.ASSIGNED_TO) {
                const target = graph.nodes.get(edge.targetId);
                if (target)
                    owners.add(target.label);
            }
            else if (edge.relationship === graph_edge_1.GraphRelationship.ASSIGNED_TO) {
                // Recursive check for requirements
                for (const [innerId, innerEdge] of graph.edges) {
                    if (innerEdge.sourceId === creditId && innerEdge.targetId === edge.sourceId) {
                        const target = graph.nodes.get(edge.targetId);
                        if (target)
                            owners.add(target.label);
                    }
                }
            }
        }
        return Array.from(owners);
    }
    static queryAssignments(projectId, creditId) {
        const graph = graph_repository_1.GraphRepository.getGraph(projectId);
        const assignments = [];
        for (const [id, edge] of graph.edges) {
            if (edge.sourceId === creditId && edge.relationship === graph_edge_1.GraphRelationship.ASSIGNED_TO) {
                const target = graph.nodes.get(edge.targetId);
                if (target)
                    assignments.push({ requirementType: "Overall Credit", contributorName: target.label });
            }
            else if (edge.relationship === graph_edge_1.GraphRelationship.ASSIGNED_TO) {
                // Recursive check for requirements
                for (const [innerId, innerEdge] of graph.edges) {
                    if (innerEdge.sourceId === creditId && innerEdge.targetId === edge.sourceId) {
                        const target = graph.nodes.get(edge.targetId);
                        const reqNode = graph.nodes.get(edge.sourceId);
                        if (target && reqNode) {
                            assignments.push({ requirementType: reqNode.label, contributorName: target.label });
                        }
                    }
                }
            }
        }
        return assignments;
    }
    static queryMissingEvidence(projectId, creditId) {
        const graph = graph_repository_1.GraphRepository.getGraph(projectId);
        const missing = new Set();
        for (const [id, edge] of graph.edges) {
            if (edge.sourceId === creditId && edge.relationship === graph_edge_1.GraphRelationship.REQUIRES) {
                const reqNode = graph.nodes.get(edge.targetId);
                let hasDoc = false;
                for (const [innerId, docEdge] of graph.edges) {
                    if (docEdge.targetId === edge.targetId && docEdge.relationship === graph_edge_1.GraphRelationship.SATISFIES) {
                        hasDoc = true;
                    }
                }
                if (!hasDoc && reqNode)
                    missing.add(reqNode.label);
            }
        }
        return Array.from(missing);
    }
    static queryRecommendations(projectId, creditId) {
        const missing = this.queryMissingEvidence(projectId, creditId);
        return missing.map(m => `Upload ${m}`);
    }
    static queryDecisions(projectId) {
        const graph = graph_repository_1.GraphRepository.getGraph(projectId);
        const decisions = [];
        for (const [id, node] of graph.nodes) {
            if (node.type === graph_types_1.GraphNodeType.DECISION) {
                decisions.push(node.label);
            }
        }
        return decisions;
    }
}
exports.GraphQueryEngine = GraphQueryEngine;
