"use strict";
/**
 * Tracknov Extraction Feedback - Reviewer Override Tracker
 * Persists auditor override logs of AI warnings or rules.
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
exports.ReviewerOverrideTracker = void 0;
const admin_1 = require("@/lib/supabase/admin");
class ReviewerOverrideTracker {
    /**
     * Logs a reviewer override event in the database for accuracy telemetry.
     */
    static logOverride(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const supabase = (0, admin_1.createAdminClient)();
                const { error } = yield supabase.from("reviewer_override_events").insert({
                    project_id: params.projectId,
                    document_id: params.documentId,
                    override_type: params.overrideType,
                    override_reason: params.overrideReason,
                    trace_id: params.traceId || undefined,
                });
                if (error) {
                    console.error("Failed to insert override event:", error);
                    return false;
                }
                return true;
            }
            catch (err) {
                console.error("Error in ReviewerOverrideTracker:", err);
                return false;
            }
        });
    }
}
exports.ReviewerOverrideTracker = ReviewerOverrideTracker;
