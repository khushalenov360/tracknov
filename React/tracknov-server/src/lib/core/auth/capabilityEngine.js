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
exports.hasCapability = hasCapability;
exports.canUser = canUser;
exports.assertCapability = assertCapability;
const server_1 = require("@/lib/supabase/server");
const CAPABILITY_MAP = {
    super_user: [
        "view_project", "edit_project", "submit_document", "review_document",
        "approve_document", "assign_task", "bypass_validation", "lock_manual", "audit_logs"
    ],
    project_admin: [
        "view_project", "edit_project", "submit_document", "review_document",
        "approve_document", "assign_task", "audit_logs"
    ],
    owner: [
        "view_project", "submit_document", "review_document"
    ],
    architect: ["view_project", "submit_document"],
    mep: ["view_project", "submit_document"],
    consultant: ["view_project", "submit_document", "review_document"],
    contractor: ["view_project", "submit_document"],
};
function hasCapability(role, capability) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!role)
            return false;
        const capabilities = CAPABILITY_MAP[role] || [];
        return capabilities.includes(capability);
    });
}
function canUser(role, action, context) {
    const capabilities = CAPABILITY_MAP[role] || [];
    return capabilities.includes(action);
}
function assertCapability(projectId, capability) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const supabase = yield (0, server_1.createClient)();
        const { data: { user } } = yield supabase.auth.getUser();
        if (!user) {
            return { allowed: false, role: null };
        }
        const { data: membership } = yield supabase
            .from("project_users")
            .select("role")
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .single();
        const role = (_a = membership === null || membership === void 0 ? void 0 : membership.role) !== null && _a !== void 0 ? _a : null;
        const allowed = yield hasCapability(role, capability);
        return { allowed, role };
    });
}
