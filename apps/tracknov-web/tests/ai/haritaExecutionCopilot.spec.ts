import { describe, it, expect, vi } from "vitest";
import { projectContextAssembler } from "@/ai/context/projectContextAssembler";
import { assertCapability } from "@tracknov/core/auth/capabilityEngine";

vi.mock("@/lib/auth/capabilityEngine", () => ({
  assertCapability: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              name: "Test Project",
              client: "Test Client",
              location: "NY",
              certification_state: "IN_PROGRESS",
              target_rating: "Gold"
            }
          }))
        }))
      }))
    }))
  }))
}));

describe("Harita AI Copilot Governance", () => {
  it("denies context extraction for unauthorized users", async () => {
    vi.mocked(assertCapability).mockResolvedValueOnce({ allowed: false, role: "guest" });

    const context = await projectContextAssembler.assembleContext("proj-1", "guest");
    expect(context).toContain("Access Denied");
  });

  it("extracts clean project context for authorized users", async () => {
    vi.mocked(assertCapability).mockResolvedValueOnce({ allowed: true, role: "consultant" });

    const context = await projectContextAssembler.assembleContext("proj-1", "consultant");
    expect(context).toContain("Test Project");
    expect(context).toContain("Gold");
  });
});
