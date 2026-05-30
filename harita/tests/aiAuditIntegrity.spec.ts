import { test, expect } from "@playwright/test";
import { logAiRecommendation } from "../lib/ai/aiRuntimeAuditLogger";
import { governanceLocalStorage } from "../lib/governance/governanceContext";
import { createAdminClient } from "../lib/supabase/admin";
import crypto from "node:crypto";

const PROJECT_ID = "b73d7310-df16-4d26-b6c8-61bebb197410"; // Bhavarkua

test.describe("AI Audit Integrity Validation", () => {
  test("should generate immutable audit logs with trace and causality IDs", async () => {
    const traceId = crypto.randomUUID();
    const causalityChainId = crypto.randomUUID();

    // Mock governance context
    await (governanceLocalStorage as any).run(
      { traceId, causalityChainId, actorId: null, frameworkVersion: "GI_V1" },
      async () => {
        const result = await logAiRecommendation({
          projectId: PROJECT_ID,
          recommendationType: "TEST_AUDIT",
          payload: { test: true },
          reasoning: "Validation of audit integrity."
        });

        expect(result.traceId).toBe(traceId);
        expect(result.causalityChainId).toBe(causalityChainId);

        // Verify in DB
        const admin = createAdminClient();
        const { data, error } = await admin
          .from("ai_recommendation_logs")
          .select("*")
          .eq("trace_id", traceId)
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.causality_chain_id).toBe(causalityChainId);
        expect(data.recommendation_type).toBe("TEST_AUDIT");
      }
    );
  });

  test("should fail if audit logging fails (enforcing integrity)", async () => {
    // Attempting to log with invalid project ID to trigger DB error
    await expect(
      logAiRecommendation({
        projectId: "invalid-uuid",
        recommendationType: "FAIL_TEST",
        payload: {}
      })
    ).rejects.toThrow(/AI_AUDIT_INTEGRITY_VIOLATION/);
  });
});
