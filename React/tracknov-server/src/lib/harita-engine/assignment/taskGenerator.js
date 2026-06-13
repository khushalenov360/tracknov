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
exports.taskGenerator = void 0;
const assignmentService_1 = require("./assignmentService");
exports.taskGenerator = {
    generateTasksForUser(projectId, userRole, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const assignments = yield assignmentService_1.assignmentService.getActiveAssignments(projectId);
            // Filter assignments mapped to this user's role or exact ID
            const relevantAssignments = assignments.filter((a) => {
                if (userId && a.user_id === userId)
                    return true;
                if (!a.user_id && a.role === userRole)
                    return true;
                return false;
            });
            return relevantAssignments.map((a) => ({
                id: a.id,
                projectId: a.project_id,
                creditId: a.project_credit_id,
                taskType: "upload_document",
                description: `Upload required document: ${a.document_type}`,
                assignedRole: a.role,
                assignedUserId: a.user_id,
                status: "pending",
                createdAt: a.created_at,
            }));
        });
    }
};
