"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewerFatigueEngine = void 0;
class ReviewerFatigueEngine {
    /**
     * Evaluates reviewer actions to detect fatigue states
     */
    static analyzeFatigue(logs) {
        if (logs.length === 0) {
            return {
                fatigueScore: 0,
                level: "NORMAL",
                rejectionStreakCount: 0,
                clarificationCount: 0,
                averageDecisionTimeMs: 0,
                isOverloaded: false,
                warnings: [],
            };
        }
        const totalActions = logs.length;
        let totalTime = 0;
        let rejectionStreak = 0;
        let maxRejectionStreak = 0;
        let clarificationCount = 0;
        // Process from oldest to newest to detect streaks
        const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        sortedLogs.forEach((log) => {
            totalTime += log.durationMs;
            if (log.actionType === "REJECT") {
                rejectionStreak++;
                if (rejectionStreak > maxRejectionStreak) {
                    maxRejectionStreak = rejectionStreak;
                }
            }
            else {
                rejectionStreak = 0;
            }
            if (log.actionType === "CLARIFICATION") {
                clarificationCount++;
            }
        });
        const averageDecisionTimeMs = Math.round(totalTime / totalActions);
        // Calculate fatigue base points
        let points = 0;
        // Streak rejections add fatigue (reviewer gets frustrated/impatient)
        if (maxRejectionStreak >= 5) {
            points += 35;
        }
        else if (maxRejectionStreak >= 3) {
            points += 15;
        }
        // High frequency of clarifications adds cognitive weight
        if (clarificationCount >= 10) {
            points += 30;
        }
        else if (clarificationCount >= 5) {
            points += 15;
        }
        // Fast decision times might mean skipping thorough reading (impatience) or extremely slow might mean stagnation
        if (averageDecisionTimeMs < 15000 && totalActions > 5) {
            points += 20; // Rushing fatigue
        }
        else if (averageDecisionTimeMs > 180000) {
            points += 15; // Exhaustion fatigue
        }
        // High volume fatigue
        if (totalActions > 30) {
            points += 30;
        }
        else if (totalActions > 15) {
            points += 15;
        }
        const fatigueScore = Math.min(100, points);
        let level = "NORMAL";
        if (fatigueScore >= 80)
            level = "CRITICAL";
        else if (fatigueScore >= 60)
            level = "HIGH";
        else if (fatigueScore >= 35)
            level = "MODERATE";
        const warnings = [];
        if (maxRejectionStreak >= 4) {
            warnings.push("High rejection streak detected. Take a 5-minute break to ensure evaluation standards remain objective.");
        }
        if (clarificationCount >= 8) {
            warnings.push("Excessive draft clarification loop cycles. Consider direct team calling rather than writing more notes.");
        }
        if (averageDecisionTimeMs < 10000 && totalActions > 8) {
            warnings.push("Review decisions are triggering very quickly. Pause to verify evidence checksums.");
        }
        if (totalActions > 25) {
            warnings.push("You have evaluated more than 25 submittals this session. Stand up, stretch, and grab water.");
        }
        return {
            fatigueScore,
            level,
            rejectionStreakCount: maxRejectionStreak,
            clarificationCount,
            averageDecisionTimeMs,
            isOverloaded: fatigueScore >= 60,
            warnings,
        };
    }
}
exports.ReviewerFatigueEngine = ReviewerFatigueEngine;
