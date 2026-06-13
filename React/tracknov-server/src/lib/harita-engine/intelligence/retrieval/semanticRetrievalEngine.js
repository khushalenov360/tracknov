"use strict";
/**
 * Tracknov Document Intelligence - Semantic Retrieval Engine
 * Conducts semantic vector search over document indexes with strict multi-tenant isolation.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticRetrievalEngine = void 0;
const evidenceEmbeddingEngine_1 = require("../../document-intelligence/evidenceEmbeddingEngine");
class SemanticRetrievalEngine {
    /**
     * Retrieves relevant chunks using cosine similarity calculation.
     * Multi-tenant security check: strict where filter on project_id.
     */
    static retrieve(client_1, projectId_1, query_1) {
        return __awaiter(this, arguments, void 0, function* (client, projectId, query, limit = 3) {
            const queryVector = evidenceEmbeddingEngine_1.EvidenceEmbeddingEngine.generateMockVector(query);
            // Fetch all active embeddings for the current project
            const { data: dbEmbeddings, error } = yield client
                .from("embeddings")
                .select("document_id, content, embedding, metadata")
                .eq("project_id", projectId);
            if (error || !dbEmbeddings) {
                console.error("Failed to query project embeddings:", error === null || error === void 0 ? void 0 : error.message);
                return [];
            }
            const hits = [];
            for (const record of dbEmbeddings) {
                if (!record.embedding)
                    continue;
                const similarity = this.cosineSimilarity(queryVector, record.embedding);
                hits.push({
                    documentId: record.document_id,
                    content: record.content,
                    relevanceScore: Math.round(similarity * 1000) / 1000,
                    metadata: record.metadata,
                });
            }
            // Sort by relevance score descending
            return hits
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, limit);
        });
    }
    static cosineSimilarity(vecA, vecB) {
        let dotProduct = 0.0;
        let normA = 0.0;
        let normB = 0.0;
        for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1.0);
    }
}
exports.SemanticRetrievalEngine = SemanticRetrievalEngine;
