"use strict";
/**
 * Tracknov Extraction Feedback - Extraction Ranking Optimizer
 * Optimizes semantic retrieval ranking using override and correction logs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractionRankingOptimizer = void 0;
class ExtractionRankingOptimizer {
    /**
     * Adjusts retrieval scores based on historic reliability overrides.
     */
    static rerank(candidates, overriddenDocIds) {
        return candidates
            .map(doc => {
            let score = doc.score;
            // Penalize retrieved segments from documents that historically incurred corrections
            if (overriddenDocIds.has(doc.documentId)) {
                score -= 0.12;
            }
            return {
                documentId: doc.documentId,
                score: Number(score.toFixed(3))
            };
        })
            .sort((a, b) => b.score - a.score);
    }
}
exports.ExtractionRankingOptimizer = ExtractionRankingOptimizer;
