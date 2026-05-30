import { describe, it, expect, vi } from "vitest";
import { runRuntimeTransition, RuntimeTransitionRequest } from "@/core/runtime/orchestrator";
import { withExecutionContext } from "@/core/runtime/executionContext";
import { workflowOrchestratorService } from "@tracknov/harita-engine/services/workflow-orchestrator-service";
import * as assertModule from "@tracknov/core/auth/capabilityEngine";

vi.mock("@/lib/auth/capabilityEngine", () => ({
  assertCapability: vi.fn(),
}));

vi.mock("@/lib/services/workflow-orchestrator-service", () => ({
  workflowOrchestratorService: {
    transition: vi.fn(),
  },
}));

vi.mock("@/core/runtime/derivedStateEngine", () => ({
  recomputeDerivedState: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: "audit-123" } })),
        })),
      })),
    })),
  })),
}));

describe("Runtime Orchestrator execution boundary", () => {
  it("fails early when capability is denied", async () => {
    vi.mocked(assertModule.assertCapability).mockResolvedValueOnce({ allowed: false, role: "guest" });

    const request: RuntimeTransitionRequest = {
      entityType: "document",
      entityId: "123",
      targetState: "SUBMITTED",
      projectId: "proj-123",
    };

    const res = await runRuntimeTransition(null, request);
    expect(res.success).toBe(false);
    expect(res.errors).toContain("Access Denied: Missing capability 'submit_document' for role 'guest'");
  });

  it("proceeds to workflow engine when capability is granted", async () => {
    vi.mocked(assertModule.assertCapability).mockResolvedValueOnce({ allowed: true, role: "consultant" });
    vi.mocked(workflowOrchestratorService.transition).mockResolvedValueOnce({ ok: true, derived_state_summary: { project_id: "proj-123" } } as any);

    const request: RuntimeTransitionRequest = {
      entityType: "document",
      entityId: "123",
      targetState: "SUBMITTED",
      projectId: "proj-123",
    };

    const res = await runRuntimeTransition(null, request);
    expect(workflowOrchestratorService.transition).toHaveBeenCalled();
    expect(res.success).toBe(true);
    expect(res.workflowState).toBe("SUBMITTED");
  });
});
