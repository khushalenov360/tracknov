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
exports.workflowContextAssembler = void 0;
const admin_1 = require("@/lib/supabase/admin");
exports.workflowContextAssembler = {
    assembleContext(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const admin = (0, admin_1.createAdminClient)();
            // We fetch a summarized count of pending reviews and bottlenecks.
            const { data: docs } = yield admin
                .from("project_document")
                .select("state, status")
                .eq("project_id", projectId);
            if (!docs)
                return "No workflow data available.";
            let pendingReviews = 0;
            let rejected = 0;
            for (const doc of docs) {
                if (["L1_REVIEW", "UNDER_L3_REVIEW", "RESUBMITTED"].includes(doc.state))
                    pendingReviews++;
                if (["REJECTED", "CLARIFICATION", "L1_REJECTED"].includes(doc.state))
                    rejected++;
            }
            return `
# Workflow Context
- **Pending Reviews:** ${pendingReviews}
- **Blocked/Clarifications:** ${rejected}
    `.trim();
        });
    }
};
