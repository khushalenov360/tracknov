import { describe, it, expect, vi } from "vitest";
import { assertCapability } from "@/lib/auth/capabilityEngine";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1" } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { role: "consultant" } })),
          })),
        })),
      })),
    })),
  })),
}));

describe("RBAC Capability Engine", () => {
  it("allows consultants to submit documents", async () => {
    const { allowed, role } = await assertCapability("proj-1", "submit_document");
    expect(allowed).toBe(true);
    expect(role).toBe("consultant");
  });

  it("denies consultants from bypassing validation", async () => {
    const { allowed, role } = await assertCapability("proj-1", "bypass_validation");
    expect(allowed).toBe(false);
    expect(role).toBe("consultant");
  });
});
