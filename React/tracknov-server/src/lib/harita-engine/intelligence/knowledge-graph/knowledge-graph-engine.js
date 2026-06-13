"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeGraphEngine = void 0;
const graph_cache_1 = require("./graph-cache");
const graph_builder_1 = require("./graph-builder");
const graph_repository_1 = require("./repositories/graph-repository");
const graph_invalidator_1 = require("./graph-invalidator");
const graph_query_engine_1 = require("./graph-query-engine");
class KnowledgeGraphEngine {
    static buildGraph(projectId, runtimeContext) {
        const graph = graph_builder_1.GraphBuilder.buildFromRuntimeContext(projectId, runtimeContext);
        graph_repository_1.GraphRepository.saveGraph(projectId, graph);
        graph_cache_1.GraphCache.set(projectId, graph);
        return graph;
    }
    static refreshGraph(projectId, runtimeContext) {
        graph_invalidator_1.GraphInvalidator.invalidateProject(projectId);
        return this.buildGraph(projectId, runtimeContext);
    }
    static queryGraph(projectId) {
        return graph_query_engine_1.GraphQueryEngine;
    }
    static invalidateGraph(projectId) {
        graph_invalidator_1.GraphInvalidator.invalidateProject(projectId);
    }
    static getGraphMetrics(projectId) {
        const graph = graph_repository_1.GraphRepository.getGraph(projectId);
        return {
            nodeCount: graph.nodes.size,
            edgeCount: graph.edges.size,
            creditCount: Array.from(graph.nodes.values()).filter(n => n.type === "CREDIT").length,
            documentCount: Array.from(graph.nodes.values()).filter(n => n.type === "DOCUMENT").length,
            riskCount: Array.from(graph.nodes.values()).filter(n => n.type === "RISK").length,
        };
    }
}
exports.KnowledgeGraphEngine = KnowledgeGraphEngine;
