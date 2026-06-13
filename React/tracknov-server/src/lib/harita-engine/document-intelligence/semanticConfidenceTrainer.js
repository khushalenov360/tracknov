"use strict";
/**
 * Tracknov Extraction Feedback - Semantic Confidence Trainer
 * Calibrates precision coefficients and matching weights.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticConfidenceTrainer = void 0;
class SemanticConfidenceTrainer {
    /**
     * Calculates a trained weight value based on correction volumes.
     */
    static trainConfidenceWeights(baseWeight, historicalCorrectionsCount, recalibrationRatio) {
        const penalty = historicalCorrectionsCount * 0.015 * recalibrationRatio;
        const adjusted = baseWeight - penalty;
        return Math.max(0.4, Number(adjusted.toFixed(3)));
    }
}
exports.SemanticConfidenceTrainer = SemanticConfidenceTrainer;
