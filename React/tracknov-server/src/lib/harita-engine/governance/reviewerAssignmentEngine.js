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
exports.determineReviewerAssignment = determineReviewerAssignment;
const admin_1 = require("@/lib/supabase/admin");
const governanceContext_1 = require("./governanceContext");
/**
 * Deterministically assigns a reviewer to a submittal based on framework and specialization.
 */
function determineReviewerAssignment(projectId_1, submittalId_1) {
    return __awaiter(this, arguments, void 0, function* (projectId, submittalId, complexity = 1) {
        const context = governanceContext_1.governanceLocalStorage.getStore();
        const admin = (0, admin_1.createAdminClient)();
        // 1. Fetch available reviewers (L4/L5)
        const { data: reviewers, error: revError } = yield admin
            .from("profiles")
            .select("user_id, global_role")
            .in("global_role", ["L4", "L5", "super_user"]);
        if (revError || !reviewers || reviewers.length === 0) {
            throw new Error("No qualified reviewers available in the platform.");
        }
        // 2. Deterministic Load Balancing (Simple Hash-based for now)
        // In a real system, this would query current workload from 'workflow_tasks'
        const submittalHash = Array.from(submittalId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const reviewerIndex = submittalHash % reviewers.length;
        const assignedReviewer = reviewers[reviewerIndex];
        // 3. Priority Calculation
        let priority = 1;
        if ((context === null || context === void 0 ? void 0 : context.frameworkVersion) === "GI_V2") {
            priority += 1; // V2 gets higher baseline priority
        }
        if (complexity > 5) {
            priority += 2;
        }
        return {
            reviewerId: assignedReviewer.user_id,
            queueId: `QUEUE_${(context === null || context === void 0 ? void 0 : context.frameworkVersion) || "GI_V1"}`,
            priority,
        };
    });
}
