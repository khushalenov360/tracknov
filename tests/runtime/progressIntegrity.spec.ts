import { describe, it, expect, vi } from "vitest";
import { recomputeDerivedState } from "@/core/runtime/derivedStateEngine";

const mockRpc = vi.fn(() => Promise.resolve({ data: null }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

describe("Progress Integrity & Derived State Engine", () => {
  it("forces backend calculation of project state via RPC calls", async () => {
    await recomputeDerivedState("proj-123");
    
    // Expect the orchestrator to defer to the database to calculate progress 
    // instead of calculating averages on the React frontend.
    expect(mockRpc).toHaveBeenCalledWith("recalculate_project_state", { p_project_id: "proj-123" });
    expect(mockRpc).toHaveBeenCalledWith("recalculate_certification_state", { p_project_id: "proj-123" });
  });
});
