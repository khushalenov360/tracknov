"use strict";
/**
 * Tracknov Intelligence Core - Semantic Math Library
 * Centralized, pure vector math and similarity calculations for semantic search and duplicate detection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticMath = void 0;
class SemanticMath {
    /**
     * Calculates the cosine similarity between two numeric vectors.
     */
    static cosineSimilarity(vecA, vecB) {
        if (!vecA.length || !vecB.length || vecA.length !== vecB.length) {
            return -1.0;
        }
        let dotProduct = 0.0;
        let normA = 0.0;
        let normB = 0.0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (!normA || !normB) {
            return -1.0;
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    /**
     * Compares two high-dimensional embeddings and returns a normalized similarity score.
     */
    static compareEmbeddings(a, b) {
        const similarity = this.cosineSimilarity(a, b);
        return Math.round(similarity * 10000) / 10000;
    }
    /**
     * Sorts and ranks candidates according to their semantic similarity to a query vector.
     */
    static semanticRanking(queryVector, candidates, vectorExtractor) {
        return candidates
            .map((candidate) => {
            const vector = vectorExtractor(candidate);
            const similarity = this.cosineSimilarity(queryVector, vector);
            return Object.assign(Object.assign({}, candidate), { score: Math.round(similarity * 1000) / 1000 });
        })
            .filter((item) => Number.isFinite(item.score))
            .sort((a, b) => b.score - a.score);
    }
    /**
     * Authoritative duplication evaluation based on a hard governance threshold.
     */
    static isDuplicateEvidence(similarity, threshold = 0.95) {
        return similarity > threshold;
    }
}
exports.SemanticMath = SemanticMath;
