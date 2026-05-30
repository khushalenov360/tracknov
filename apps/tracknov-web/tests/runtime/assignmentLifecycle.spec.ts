import { describe, it, expect, vi } from "vitest";
import { assignmentService } from "@tracknov/harita-engine/assignment/assignmentService";
import { taskGenerator } from "@tracknov/harita-engine/assignment/taskGenerator";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        match: vi.fn(() => Promise.resolve()),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: "assign-123",
              project_id: "proj-1",
              project_credit_id: "credit-1",
              document_type: "Design Document",
              role: "architect",
              user_id: "user-abc",
              is_active: true,
            }
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [{
              id: "assign-123",
              project_id: "proj-1",
              project_credit_id: "credit-1",
              document_type: "Design Document",
              role: "architect",
              user_id: "user-abc",
              is_active: true,
            }]
          })),
        })),
      })),
    })),
  })),
}));

describe("Assignment Lifecycle & Task Generation", () => {
  it("creates an assignment and immediately generates a visible task", async () => {
    const assignment = await assignmentService.assignTask({
      projectId: "proj-1",
      projectCreditId: "credit-1",
      documentType: "Design Document",
      assigneeRole: "architect",
      assigneeUserId: "user-abc",
    });

    expect(assignment.id).toBe("assign-123");

    const tasks = await taskGenerator.generateTasksForUser("proj-1", "architect", "user-abc");
    
    expect(tasks).toHaveLength(1);
    expect(tasks[0].taskType).toBe("upload_document");
    expect(tasks[0].description).toContain("Design Document");
  });
});
