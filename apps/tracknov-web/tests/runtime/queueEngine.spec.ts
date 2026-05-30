import { describe, it, expect, vi } from "vitest";
import { queueEngine } from "@/core/runtime/queueEngine";
import { assignmentService } from "@tracknov/harita-engine/assignment/assignmentService";

vi.mock("@/lib/assignment/assignmentService", () => ({
  assignmentService: {
    getActiveAssignments: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table) => ({
      select: vi.fn(() => ({
        eq: vi.fn((field, val) => {
          if (table === "project_users") {
            const role = val === "admin-1" ? "project_admin" : val === "user-xyz" ? "consultant" : "architect";
            return Promise.resolve({ data: [{ project_id: "proj-1", role }] });
          }
          return {
            in: vi.fn(() => Promise.resolve({
              data: [
                { id: "doc-1", project_id: "proj-1", credit_id: "credit-1", state: "SUBMITTED", uploaded_by: "user-abc", created_at: "2023-01-01" },
                { id: "doc-2", project_id: "proj-1", credit_id: "credit-1", state: "CLARIFICATION", uploaded_by: "user-xyz", created_at: "2023-01-02" },
              ]
            })),
          };
        }),
      })),
    })),
  })),
}));

describe("Queue Engine Visibility", () => {
  it("shows SUBMITTED items to project admins", async () => {
    vi.mocked(assignmentService.getActiveAssignments).mockResolvedValueOnce([]);

    const queue = await queueEngine.buildQueue("admin-1");
    
    // Project Admin should see doc-1 for review
    expect(queue).toHaveLength(1);
    expect(queue[0].documentId).toBe("doc-1");
    expect(queue[0].type).toBe("review");
  });

  it("shows CLARIFICATION items to the original uploader", async () => {
    vi.mocked(assignmentService.getActiveAssignments).mockResolvedValueOnce([]);

    const queue = await queueEngine.buildQueue("user-xyz");
    
    // Uploader should see doc-2 for clarification
    expect(queue).toHaveLength(1);
    expect(queue[0].documentId).toBe("doc-2");
    expect(queue[0].type).toBe("clarification");
    expect(queue[0].priority).toBe("high");
  });

  it("shows CLARIFICATION items to explicitly assigned users even if they didn't upload it", async () => {
    vi.mocked(assignmentService.getActiveAssignments).mockResolvedValueOnce([
      { id: "assign-1", project_id: "proj-1", project_credit_id: "credit-1", document_type: "Doc", role: "architect", user_id: "user-123", is_active: true } as any
    ]);

    const queue = await queueEngine.buildQueue("user-123");
    
    // Architect is assigned to credit-1, so they see the clarification for doc-2
    expect(queue).toHaveLength(1);
    expect(queue[0].documentId).toBe("doc-2");
    expect(queue[0].type).toBe("clarification");
  });
});
