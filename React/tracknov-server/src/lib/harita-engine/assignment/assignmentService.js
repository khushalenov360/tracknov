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
exports.assignmentService = void 0;
const admin_1 = require("@/lib/supabase/admin");
exports.assignmentService = {
    assignTask(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const admin = (0, admin_1.createAdminClient)();
            // Inactivate any previous assignment for the same document type on this credit
            yield admin
                .from("assignments")
                .update({ is_active: false })
                .match({
                project_id: payload.projectId,
                project_credit_id: payload.projectCreditId,
                document_type: payload.documentType,
                is_active: true,
            });
            // Create the new active assignment
            const { data: assignment, error } = yield admin
                .from("assignments")
                .insert({
                project_id: payload.projectId,
                project_credit_id: payload.projectCreditId,
                document_type: payload.documentType,
                role: payload.assigneeRole,
                user_id: payload.assigneeUserId,
                is_active: true,
                assigned_by: payload.actorId,
            })
                .select()
                .single();
            if (error)
                throw new Error(error.message);
            return assignment;
        });
    },
    getActiveAssignments(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const admin = (0, admin_1.createAdminClient)();
            const { data, error } = yield admin
                .from("assignments")
                .select("*")
                .eq("project_id", projectId)
                .eq("is_active", true);
            if (error)
                throw new Error(error.message);
            return data;
        });
    }
};
