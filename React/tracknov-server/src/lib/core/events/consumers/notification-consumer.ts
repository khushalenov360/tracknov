import { eventBus } from "../event-bus";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectMembersByRoles, notifyUsers } from "@/lib/harita-engine/services/notification-service";

export function registerNotificationConsumers() {
  eventBus.subscribe(async (event) => {
    const admin = createAdminClient();

    switch (event.type) {
      case "DOCUMENT_UPLOADED": {
        const { projectId, documentId } = event.payload;
        const ownerIds = await getProjectMembersByRoles(admin, projectId, ["owner"]);
        await notifyUsers(admin, {
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
            const adminIds = await getProjectMembersByRoles(admin, projectId, ["project_admin", "super_admin"]);
            await notifyUsers(admin, {
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
        const ownerIds = await getProjectMembersByRoles(admin, projectId, ["owner"]);
        await notifyUsers(admin, {
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
        const ownerIds = await getProjectMembersByRoles(admin, projectId, ["owner", "client"]);
        await notifyUsers(admin, {
          projectId,
          userIds: ownerIds,
          body: `Tokens credited: ${amount} for ${reason}`,
          actionUrl: `/team`,
        });
        break;
      }
    }
  });
}
