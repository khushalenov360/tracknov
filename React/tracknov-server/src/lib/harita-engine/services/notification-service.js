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
exports.notifyUsers = notifyUsers;
exports.getProjectMembersByRoles = getProjectMembersByRoles;
function notifyUsers(writer_1, _a) {
    return __awaiter(this, arguments, void 0, function* (writer, { projectId, creditId, documentId, userIds, body, actionUrl, }) {
        // SECTION 12: Emergency Kill Switch
        const { data: notifyControl } = yield writer
            .from("system_controls")
            .select("is_enabled")
            .eq("feature_name", "notifications")
            .maybeSingle();
        if (notifyControl && !notifyControl.is_enabled) {
            return;
        }
        const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
        if (!uniqueUserIds.length || !body.trim()) {
            return;
        }
        const rows = uniqueUserIds.map((userId) => ({
            project_id: projectId,
            credit_id: creditId !== null && creditId !== void 0 ? creditId : null,
            document_id: documentId !== null && documentId !== void 0 ? documentId : null,
            user_id: userId,
            body,
            action_url: actionUrl !== null && actionUrl !== void 0 ? actionUrl : null,
        }));
        yield writer.from("notifications").insert(rows);
        const { data: recipients } = yield writer
            .from("profiles")
            .select("user_id, email")
            .in("user_id", uniqueUserIds);
        const outboxRows = (recipients !== null && recipients !== void 0 ? recipients : [])
            .filter((recipient) => Boolean(recipient.email))
            .map((recipient) => ({
            user_id: recipient.user_id,
            project_id: projectId,
            document_id: documentId !== null && documentId !== void 0 ? documentId : null,
            channel: "email",
            recipient: String(recipient.email),
            subject: "Tracknov notification",
            body,
            action_url: actionUrl !== null && actionUrl !== void 0 ? actionUrl : null,
            status: "PENDING",
        }));
        if (outboxRows.length) {
            yield writer.from("notification_outbox").insert(outboxRows);
        }
    });
}
function getProjectMembersByRoles(writer, projectId, roles) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield writer
            .from("project_users")
            .select("user_id")
            .eq("project_id", projectId)
            .in("role", roles);
        return (data !== null && data !== void 0 ? data : []).map((row) => row.user_id).filter(Boolean);
    });
}
