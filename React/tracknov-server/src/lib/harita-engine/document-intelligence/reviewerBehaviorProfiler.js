"use strict";
/**
 * Tracknov Extraction Feedback - Reviewer Behavior Profiler
 * Models individual reviewer profiles and expected rigor levels.
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
exports.ReviewerBehaviorProfiler = void 0;
const admin_1 = require("@/lib/supabase/admin");
class ReviewerBehaviorProfiler {
    /**
     * Profiles a reviewer, classifying their rigor level and correction thresholds.
     */
    static profileReviewer(reviewerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const supabase = (0, admin_1.createAdminClient)();
                const { count } = yield supabase
                    .from("extraction_corrections")
                    .select("*", { count: "exact", head: true })
                    .eq("reviewer_id", reviewerId);
                const totalCorrections = count || 0;
                let rigorLevel = "MODERATE";
                if (totalCorrections > 10) {
                    rigorLevel = "STRICT";
                }
                else if (totalCorrections < 3) {
                    rigorLevel = "LENIENT";
                }
                return {
                    reviewerId,
                    rigorLevel,
                    correctionsSubmittedCount: totalCorrections,
                    simulatedAcceptanceRate: Number(Math.max(0.65, 1.0 - (totalCorrections * 0.03)).toFixed(3))
                };
            }
            catch (err) {
                console.error("Error in ReviewerBehaviorProfiler:", err);
                return {
                    reviewerId,
                    rigorLevel: "MODERATE",
                    correctionsSubmittedCount: 0,
                    simulatedAcceptanceRate: 0.95
                };
            }
        });
    }
}
exports.ReviewerBehaviorProfiler = ReviewerBehaviorProfiler;
