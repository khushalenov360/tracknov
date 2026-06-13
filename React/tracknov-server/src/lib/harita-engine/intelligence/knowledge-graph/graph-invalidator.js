"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphInvalidator = void 0;
const graph_cache_1 = require("./graph-cache");
const graph_repository_1 = require("./repositories/graph-repository");
class GraphInvalidator {
    static invalidateProject(projectId) {
        graph_cache_1.GraphCache.invalidate(projectId);
    }
    static invalidateCredit(projectId, creditId) {
        graph_cache_1.GraphCache.invalidate(projectId);
        graph_repository_1.GraphRepository.deleteNode(projectId, creditId);
    }
    static invalidateDocument(projectId, documentId) {
        graph_cache_1.GraphCache.invalidate(projectId);
        graph_repository_1.GraphRepository.deleteNode(projectId, documentId);
    }
}
exports.GraphInvalidator = GraphInvalidator;
