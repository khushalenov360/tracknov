"use strict";
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
exports.toneService = exports.ToneService = void 0;
const admin_1 = require("@/lib/supabase/admin");
class ToneService {
    getUserTone(userId, role) {
        return __awaiter(this, void 0, void 0, function* () {
            const supabase = (0, admin_1.createAdminClient)();
            // Fetch behavior metrics
            const { data: behavior } = yield supabase
                .from("user_behavior")
                .select("usage_score, error_rate")
                .eq("user_id", userId)
                .maybeSingle();
            const score = (behavior === null || behavior === void 0 ? void 0 : behavior.usage_score) || 0;
            const errorRate = (behavior === null || behavior === void 0 ? void 0 : behavior.error_rate) || 0;
            // Logic:
            // 1. If error rate is high (> 30%), use Operator (Guided)
            if (errorRate > 0.3) {
                return "Operator";
            }
            // 2. If role is high-level or score is very high, use Executive
            if (role === "super_user" || role === "super_admin" || score > 80) {
                return "Executive";
            }
            // 3. Default for experienced users
            if (score > 40) {
                return "Power";
            }
            // 4. Default for new/low-usage users
            return "Operator";
        });
    }
    getToneInstructions(tone) {
        switch (tone) {
            case "Executive":
                return "TONE: Executive Mode. Be extremely concise. Focus on ROI, project completion percentages, and high-level blockers. Use professional, results-oriented language.";
            case "Operator":
                return "TONE: Operator Mode (Guided). Be helpful and instructional. Explain *how* to resolve blockers. Break down complex tasks into simple steps. Use encouraging language.";
            case "Power":
                return "TONE: Power Mode. Be technical and fast. Use industry jargon correctly. Focus on technical data points, credit codes, and specific document requirements. No fluff.";
            default:
                return "";
        }
    }
}
exports.ToneService = ToneService;
exports.toneService = new ToneService();
