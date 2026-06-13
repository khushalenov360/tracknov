"use strict";
/**
 * Tracknov Knowledge Governance - Confidence Decay Monitor
 * Computes moving averages of confidence levels to identify silent model degradation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceDecayMonitor = void 0;
class ConfidenceDecayMonitor {
    /**
     * Scans weekly confidence indices and raises alert if decay trends exist.
     */
    static monitorDecay(weeklyConfidences) {
        if (weeklyConfidences.length < 3) {
            return { decayDetected: false, decayRate: 0, alertSeverity: "NONE" };
        }
        // Simple slope calculation
        const slope = weeklyConfidences[weeklyConfidences.length - 1] - weeklyConfidences[0];
        const decayRate = -slope;
        if (decayRate > 0.12) {
            return {
                decayDetected: true,
                decayRate,
                alertSeverity: "HIGH"
            };
        }
        else if (decayRate > 0.05) {
            return {
                decayDetected: true,
                decayRate,
                alertSeverity: "LOW"
            };
        }
        return {
            decayDetected: false,
            decayRate: 0,
            alertSeverity: "NONE"
        };
    }
}
exports.ConfidenceDecayMonitor = ConfidenceDecayMonitor;
