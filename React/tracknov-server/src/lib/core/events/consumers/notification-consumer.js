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
exports.registerNotificationConsumers = registerNotificationConsumers;
const event_bus_1 = require("../event-bus");
const admin_1 = require("@/lib/supabase/admin");
const notification_service_1 = require("@/lib/harita-engine/services/notification-service");
function registerNotificationConsumers() {
    event_bus_1.eventBus.subscribe((event) => __awaiter(this, void 0, void 0, function* () {
        const admin = (0, admin_1.createAdminClient)();
        switch (event.type) {
            case "DOCUMENT_UPLOADED": {
                const { projectId, documentId } = event.payload;
                const ownerIds = yield (0, notification_service_1.getProjectMembersByRoles)(admin, projectId, ["owner"]);
                yield (0, notification_service_1.notifyUsers)(admin, {
                    projectId,
                    documentId,
                    userIds: ownerIds,
                    body: `New document uploaded. Pending your review.`,
                    actionUrl: `/review-queue?project=${projectId}&document=${documentId}`,
                });
                break;
            }
            case "REVIEW_COMPLETED": {
                const { projectId, documentId, status } = event.payload;
                if (status === "UNDER_REVIEW") {
                    const adminIds = yield (0, notification_service_1.getProjectMembersByRoles)(admin, projectId, ["project_admin", "super_admin"]);
                    yield (0, notification_service_1.notifyUsers)(admin, {
                        projectId,
                        documentId,
                        userIds: adminIds,
                        body: `Document moved to Project Admin review.`,
                        actionUrl: `/review-queue?project=${projectId}&document=${documentId}`,
                    });
                }
                break;
            }
            case "DOCUMENT_REJECTED": {
                const { projectId, documentId, reason } = event.payload;
                // Notify all owners about the rejection
                const ownerIds = yield (0, notification_service_1.getProjectMembersByRoles)(admin, projectId, ["owner"]);
                yield (0, notification_service_1.notifyUsers)(admin, {
                    projectId,
                    documentId,
                    userIds: ownerIds,
                    body: `Document rejected: ${reason.substring(0, 50)}...`,
                    actionUrl: `/documents?project=${projectId}&document=${documentId}`,
                });
                break;
            }
            case "TOKEN_CREDITED": {
                const { projectId, amount, reason } = event.payload;
                const ownerIds = yield (0, notification_service_1.getProjectMembersByRoles)(admin, projectId, ["owner", "client"]);
                yield (0, notification_service_1.notifyUsers)(admin, {
                    projectId,
                    userIds: ownerIds,
                    body: `Tokens credited: ${amount} for ${reason}`,
                    actionUrl: `/team`,
                });
                break;
            }
        }
    }));
}
