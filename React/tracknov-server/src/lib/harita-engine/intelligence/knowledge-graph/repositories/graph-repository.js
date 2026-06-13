"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphRepository = void 0;
class GraphRepository {
    static getGraph(projectId) {
        if (!this.storage.has(projectId)) {
            this.storage.set(projectId, { nodes: new Map(), edges: new Map() });
        }
        return this.storage.get(projectId);
    }
    static saveGraph(projectId, graph) {
        this.storage.set(projectId, graph);
    }
    static saveNode(projectId, node) {
        const graph = this.getGraph(projectId);
        graph.nodes.set(node.id, node);
    }
    static saveEdge(projectId, edge) {
        const graph = this.getGraph(projectId);
        graph.edges.set(edge.id, edge);
    }
    static deleteNode(projectId, nodeId) {
        const graph = this.getGraph(projectId);
        graph.nodes.delete(nodeId);
    }
    static deleteEdge(projectId, edgeId) {
        const graph = this.getGraph(projectId);
        graph.edges.delete(edgeId);
    }
}
exports.GraphRepository = GraphRepository;
GraphRepository.storage = new Map();
