import { createAdminClient } from "@/lib/supabase/admin";
import { assignmentService } from "@/lib/assignment/assignmentService";

export type QueueItem = {
  id: string;
  projectId: string;
  creditId: string;
  documentId: string;
  type: "review" | "clarification" | "approval";
  state: string;
  assignedRole: string;
  assignedUserId?: string | null;
  priority: "high" | "normal";
  createdAt: string;
};

export const queueEngine = {
  /**
   * Derives actionable items for a specific user based on their roles and explicit assignments.
   * Ensures every workflow action (submission, rejection, clarification) is visible in the correct queue.
   */
  async buildQueue(userId: string): Promise<QueueItem[]> {
    const admin = createAdminClient();
    
    // First, lookup all projects and roles for this user
    const { data: userProjects, error: uErr } = await admin
      .from("project_users")
      .select("project_id, role")
      .eq("user_id", userId);

    if (uErr) throw new Error(uErr.message);
    if (!userProjects || userProjects.length === 0) return [];

    const queue: QueueItem[] = [];

    // Process queue for each project the user belongs to
    for (const membership of userProjects) {
      const projectId = membership.project_id;
      const userRole = membership.role;

      // Fetch all active assignments for this user in this project
      const assignments = await assignmentService.getActiveAssignments(projectId);
      const myAssignments = assignments.filter((a) => a.user_id === userId || (!a.user_id && a.role === userRole));
      const myCreditIds = myAssignments.map((a) => a.project_credit_id);

      // Fetch documents pending review or clarification
      const { data: documents, error } = await admin
        .from("project_document")
        .select("id, project_id, credit_id, state, status, created_at, uploaded_by")
        .eq("project_id", projectId)
        .in("state", ["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION", "RESUBMITTED"]);

      if (error) continue; // Skip on error

      for (const doc of documents || []) {
        const state = String(doc.state || doc.status || "").toUpperCase();
        
        // If the document requires review and user is an owner/admin
        if ((state === "SUBMITTED" || state === "RESUBMITTED" || state === "UNDER_REVIEW") && 
            ["owner", "project_admin", "super_user"].includes(userRole)) {
          queue.push({
            id: `queue-${doc.id}`,
            projectId: doc.project_id,
            creditId: doc.credit_id,
            documentId: doc.id,
            type: state === "UNDER_REVIEW" ? "approval" : "review",
            state,
            assignedRole: userRole,
            priority: "normal",
            createdAt: doc.created_at,
          });
        }

        // If document is sent back for clarification and user is assigned to it or uploaded it
        if (state === "CLARIFICATION" && (doc.uploaded_by === userId || myCreditIds.includes(doc.credit_id))) {
          queue.push({
            id: `queue-${doc.id}`,
            projectId: doc.project_id,
            creditId: doc.credit_id,
            documentId: doc.id,
            type: "clarification",
            state,
            assignedRole: userRole,
            assignedUserId: userId,
            priority: "high", // Clarifications are high priority to unblock
            createdAt: doc.created_at,
          });
        }
      }
    }

    return queue.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
};

