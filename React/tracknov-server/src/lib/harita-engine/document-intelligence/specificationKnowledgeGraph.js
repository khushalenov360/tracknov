"use strict";
/**
 * Tracknov Document Intelligence - Specification Knowledge Graph
 * Structures technical parameters into a graph for cross-document engineering constraint check.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecificationKnowledgeGraph = void 0;
class SpecificationKnowledgeGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
    }
    addNode(node) {
        this.nodes.set(node.id, node);
    }
    addEdge(edge) {
        this.edges.push(edge);
    }
    getNodes() {
        return Array.from(this.nodes.values());
    }
    getEdges() {
        return this.edges;
    }
    /**
     * Identifies all direct dependencies for a given node.
     */
    getDependencies(nodeId) {
        const dependencies = [];
        for (const edge of this.edges) {
            if (edge.sourceId === nodeId && edge.type === "DEPENDS_ON") {
                const target = this.nodes.get(edge.targetId);
                if (target)
                    dependencies.push(target);
            }
        }
        return dependencies;
    }
}
exports.SpecificationKnowledgeGraph = SpecificationKnowledgeGraph;
