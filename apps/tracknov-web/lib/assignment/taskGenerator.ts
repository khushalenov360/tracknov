import { assignmentService } from "./assignmentService";

export type DashboardTask = {
  id: string;
  projectId: string;
  creditId: string;
  taskType: "upload_document" | "review_document";
  description: string;
  assignedRole: string;
  assignedUserId?: string | null;
  status: "pending" | "completed";
  createdAt: string;
};

export const taskGenerator = {
  async generateTasksForUser(projectId: string, userRole: string, userId?: string): Promise<DashboardTask[]> {
    const assignments = await assignmentService.getActiveAssignments(projectId);

    // Filter assignments mapped to this user's role or exact ID
    const relevantAssignments = assignments.filter((a) => {
      if (userId && a.user_id === userId) return true;
      if (!a.user_id && a.role === userRole) return true;
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
  }
};
