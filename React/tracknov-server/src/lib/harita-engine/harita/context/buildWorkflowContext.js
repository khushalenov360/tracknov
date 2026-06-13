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
exports.buildWorkflowContext = buildWorkflowContext;
const server_1 = require("@/lib/supabase/server");
const data_1 = require("@/lib/data");
/**
 * Builds a project-scoped, role-aware context object for the Harita.
 * Ensures all AI responses are anchored in the current project reality.
 */
function buildWorkflowContext(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const user = yield (0, data_1.getCurrentUser)();
        if (!user)
            return null;
        const supabase = (0, server_1.createClient)();
        // Fetch project basic info and membership
        const { data: membership } = yield supabase
            .from("project_users")
            .select("role, project:projects(project_code, certification_status)")
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .single();
        if (!membership)
            return null;
        // Fetch workflow stats
        const { data: credits } = yield supabase
            .from("project_credits")
            .select("id, assigned_user_id")
            .eq("project_id", projectId);
        const { data: documents } = yield supabase
            .from("project_document")
            .select("id, workflow_state")
            .eq("project_id", projectId)
            .eq("is_latest", true);
        const stats = {
            pendingUploads: (credits || []).filter(c => !c.assigned_user_id).length,
            pendingReviews: (documents || []).filter(d => d.workflow_state === "SUBMITTED").length,
            pendingValidations: (documents || []).filter(d => d.workflow_state === "UNDER_REVIEW").length,
        };
        return {
            projectId,
            projectCode: ((_a = membership.project) === null || _a === void 0 ? void 0 : _a.project_code) || null,
            currentRole: membership.role,
            lockState: {
                locked: ((_b = membership.project) === null || _b === void 0 ? void 0 : _b.certification_status) === "CERTIFIED",
                reason: ((_c = membership.project) === null || _c === void 0 ? void 0 : _c.certification_status) === "CERTIFIED" ? "Project is certified and locked." : null,
            },
            workflowStats: stats,
        };
    });
}
