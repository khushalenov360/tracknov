"use strict";
/**
 * Tracknov Document Intelligence - Evidence Embedding Engine
 * Registers semantic chunk index metadata into the embeddings table.
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
exports.EvidenceEmbeddingEngine = void 0;
class EvidenceEmbeddingEngine {
    /**
     * Deterministically calculates mock embedding vectors for local development/testing to retain replay purity.
     */
    static generateMockVector(text) {
        const vectorSize = 384;
        const vector = new Array(vectorSize).fill(0);
        // Deterministic generation from text content
        for (let i = 0; i < text.length; i++) {
            const idx = i % vectorSize;
            vector[idx] += text.charCodeAt(i) * 0.001;
        }
        // Normalize vector
        let magnitude = 0;
        for (const val of vector) {
            magnitude += val * val;
        }
        magnitude = Math.sqrt(magnitude) || 1.0;
        return vector.map(v => v / magnitude);
    }
    /**
     * Registers a chunk's text, computed vectors, and metadata in the public.embeddings database table.
     */
    static registerChunk(client, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const vector = this.generateMockVector(payload.chunkText);
            // Save to public.embeddings
            const { error } = yield client
                .from("embeddings")
                .insert({
                project_id: payload.projectId,
                document_id: payload.documentId,
                content: payload.chunkText,
                embedding: vector,
                metadata: {
                    sectionTitle: payload.sectionTitle,
                    semanticCategory: payload.semanticCategory,
                    frameworkVersion: payload.frameworkVersion,
                    replayHash: payload.replayHash,
                    traceId: payload.traceId,
                    causalityChainId: payload.causalityChainId,
                },
            });
            if (error) {
                console.error("Failed to register chunk embedding:", error.message);
                return false;
            }
            return true;
        });
    }
}
exports.EvidenceEmbeddingEngine = EvidenceEmbeddingEngine;
