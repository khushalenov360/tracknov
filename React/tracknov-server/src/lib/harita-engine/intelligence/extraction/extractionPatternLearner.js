"use strict";
/**
 * Tracknov Extraction Feedback - Extraction Pattern Learner
 * Analyzes recurring correction sequences to propose normalization mappings prospectively.
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
exports.ExtractionPatternLearner = void 0;
const admin_1 = require("@/lib/supabase/admin");
class ExtractionPatternLearner {
    /**
     * Scans correction data to identify systemic character or word replacement patterns.
     */
    static learnRecurringErrors() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const supabase = (0, admin_1.createAdminClient)();
                const { data } = yield supabase
                    .from("extraction_corrections")
                    .select("original_value, corrected_value, extraction_type")
                    .limit(200);
                const recurringOcrMistakes = {};
                const recurringAliases = {};
                if (data) {
                    for (const item of data) {
                        const orig = (item.original_value || "").trim();
                        const corr = (item.corrected_value || "").trim();
                        if (orig === corr || !orig || !corr)
                            continue;
                        // OCR Typographical Capture
                        if (item.extraction_type === "OCR" && orig.length < 15) {
                            recurringOcrMistakes[orig] = corr;
                        }
                        // Supplier Alias Capture
                        if (item.extraction_type === "TABLE" && (orig.toLowerCase().includes("daikin") || orig.toLowerCase().includes("carrier") || orig.toLowerCase().includes("trane"))) {
                            recurringAliases[orig] = corr;
                        }
                    }
                }
                return {
                    recurringOcrMistakes,
                    recurringAliases,
                    totalAnalyzed: data ? data.length : 0
                };
            }
            catch (err) {
                console.error("Error in ExtractionPatternLearner:", err);
                return {
                    recurringOcrMistakes: {},
                    recurringAliases: {},
                    totalAnalyzed: 0
                };
            }
        });
    }
}
exports.ExtractionPatternLearner = ExtractionPatternLearner;
