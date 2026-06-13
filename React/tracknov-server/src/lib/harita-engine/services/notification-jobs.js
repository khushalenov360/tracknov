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
exports.runNotificationDigestJobs = runNotificationDigestJobs;
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
const notification_service_1 = require("@/lib/harita-engine/services/notification-service");
function runNotificationDigestJobs() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (!env_1.env.supabaseServiceRoleKey) {
            return { ok: false, error: "Service role key is required for digest jobs." };
        }
        const admin = (0, admin_1.createAdminClient)();
        const runStart = yield admin
            .from("notification_digest_runs")
            .insert({ run_type: "weekly_digest", status: "running" })
            .select("id")
            .single();
        const runId = (_a = runStart.data) === null || _a === void 0 ? void 0 : _a.id;
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
            const [{ data: projects }, { data: pendingDocs }, { data: inactiveDocs }] = yield Promise.all([
                admin.from("projects").select("id, name"),
                admin
                    .from("project_document")
                    .select("id, project_id, state, uploaded_at")
                    .in("state", ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"])
                    .gte("uploaded_at", sevenDaysAgo),
                admin
                    .from("project_document")
                    .select("id, project_id, state, uploaded_at")
                    .in("state", ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"])
                    .lt("uploaded_at", fiveDaysAgo),
            ]);
            const projectNames = new Map((projects !== null && projects !== void 0 ? projects : []).map((project) => [project.id, project.name]));
            const groupedByProject = new Map();
            for (const doc of pendingDocs !== null && pendingDocs !== void 0 ? pendingDocs : []) {
                groupedByProject.set(doc.project_id, ((_b = groupedByProject.get(doc.project_id)) !== null && _b !== void 0 ? _b : 0) + 1);
            }
            let created = 0;
            for (const [projectId, count] of groupedByProject.entries()) {
                const targetUsers = yield admin
                    .from("project_users")
                    .select("user_id")
                    .eq("project_id", projectId)
                    .in("role", ["owner", "project_admin", "super_admin", "super_user"]);
                const userIds = ((_c = targetUsers.data) !== null && _c !== void 0 ? _c : []).map((row) => row.user_id).filter(Boolean);
                if (!userIds.length)
                    continue;
                yield (0, notification_service_1.notifyUsers)(admin, {
                    projectId,
                    userIds,
                    body: `Weekly digest: ${count} document(s) are pending review in ${(_d = projectNames.get(projectId)) !== null && _d !== void 0 ? _d : "your project"}.`,
                    actionUrl: `/review-queue?project=${projectId}`,
                });
                created += userIds.length;
            }
            for (const doc of inactiveDocs !== null && inactiveDocs !== void 0 ? inactiveDocs : []) {
                const targetUsers = yield admin
                    .from("project_users")
                    .select("user_id")
                    .eq("project_id", doc.project_id)
                    .in("role", ["owner", "project_admin", "super_admin", "super_user"]);
                const userIds = ((_e = targetUsers.data) !== null && _e !== void 0 ? _e : []).map((row) => row.user_id).filter(Boolean);
                if (!userIds.length)
                    continue;
                yield (0, notification_service_1.notifyUsers)(admin, {
                    projectId: doc.project_id,
                    documentId: doc.id,
                    userIds,
                    body: `Reminder: a document has been waiting in review for over 5 days in ${(_f = projectNames.get(doc.project_id)) !== null && _f !== void 0 ? _f : "your project"}.`,
                    actionUrl: `/review-queue?project=${doc.project_id}&document=${doc.id}`,
                });
                created += userIds.length;
            }
            if (runId) {
                yield admin
                    .from("notification_digest_runs")
                    .update({
                    status: "completed",
                    completed_at: new Date().toISOString(),
                    records_created: created,
                })
                    .eq("id", runId);
            }
            return { ok: true, recordsCreated: created };
        }
        catch (error) {
            if (runId) {
                yield admin
                    .from("notification_digest_runs")
                    .update({
                    status: "failed",
                    completed_at: new Date().toISOString(),
                    error: String((_g = error === null || error === void 0 ? void 0 : error.message) !== null && _g !== void 0 ? _g : "Digest job failed"),
                })
                    .eq("id", runId);
            }
            return { ok: false, error: String((_h = error === null || error === void 0 ? void 0 : error.message) !== null && _h !== void 0 ? _h : "Digest job failed") };
        }
    });
}
