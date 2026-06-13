"use strict";
/**
 * Tracknov Extraction Feedback - Adaptive Extraction Tuner
 * Analyzes historical logs to dynamically adjust threshold metrics prospectively.
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
exports.AdaptiveExtractionTuner = void 0;
const admin_1 = require("@/lib/supabase/admin");
class AdaptiveExtractionTuner {
    /**
     * Evaluates correction rates and tunes baseline confidence thresholds prospectively.
     */
    static tuneThreshold(extractionType, baseThreshold) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const supabase = (0, admin_1.createAdminClient)();
                // Retrieve total corrections count
                const { count: correctionsCount } = yield supabase
                    .from("extraction_corrections")
                    .select("*", { count: "exact", head: true })
                    .eq("extraction_type", extractionType);
                const totalErrors = correctionsCount || 0;
                // Adjust threshold prospectively: standard drift increase based on error rate
                const errorRateModifier = Math.min(0.20, totalErrors * 0.02);
                const recommendedThreshold = Math.min(0.95, baseThreshold + errorRateModifier);
                // Compute simple simulated acceptance rate based on error historical volume
                const acceptanceRate = Math.max(0.60, 1.0 - (totalErrors * 0.04));
                return {
                    extractionType,
                    recommendedThreshold: Number(recommendedThreshold.toFixed(3)),
                    totalErrorsCount: totalErrors,
                    acceptanceRate: Number(acceptanceRate.toFixed(3))
                };
            }
            catch (err) {
                console.error("Error in AdaptiveExtractionTuner:", err);
                return {
                    extractionType,
                    recommendedThreshold: baseThreshold,
                    totalErrorsCount: 0,
                    acceptanceRate: 1.0
                };
            }
        });
    }
}
exports.AdaptiveExtractionTuner = AdaptiveExtractionTuner;
