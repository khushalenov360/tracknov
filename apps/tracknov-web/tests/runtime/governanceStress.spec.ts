import { test, expect } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables for administrative access
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin";
import { interceptMutation, runInReplayMode } from "@/lib/governance/governanceMutationInterceptor";
import { governanceLocalStorage } from "@/lib/governance/governanceContext";
import { emitGovernanceEvent } from "@/lib/governance/governanceObservabilityBus";

/**
 * GOVERNANCE RUNTIME STRESS VALIDATION
 * Purpose: Verify that the governance engine maintains determinism, purity, and isolation
 * under high concurrency and adversarial runtime conditions.
 */
test.describe("Governance Runtime Stress Validation", () => {
  // Using a known valid project ID from the database
  const projectId = "b73d7310-df16-4d26-b6c8-61bebb197410";

  test("Concurrent Replay Determinism Stress", async () => {
    const iterationCount = 50;
    const concurrentRequests = 10;
    
    console.log(`Starting Concurrent Replay Stress: ${iterationCount} iterations across ${concurrentRequests} workers...`);

    const executeIteration = async (id: number) => {
      return runInReplayMode(projectId, async () => {
        // 1. Telemetry emission under load
        await emitGovernanceEvent({
          category: "STRESS_REPLAY_STEP",
          severity: "info",
          sourceLayer: "STRESS_ENGINE",
          projectId,
          payload: { workerId: id, step: "init" }
        });

        // 2. Interception enforcement under load
        try {
          await interceptMutation({
            mutationType: "DB_WRITE",
            sourceLayer: "STRESS_ENGINE",
            reason: "STRESS_TEST_MUTATION"
          });
          return { workerId: id, intercepted: false };
        } catch (err: any) {
          const isIntercepted = err.message.includes("Intercepted");
          if (!isIntercepted) {
            console.error(`[STRESS_TEST_ERROR] Unexpected failure in worker ${id}:`, err.message);
          }
          return { workerId: id, intercepted: isIntercepted };
        }
      });
    };

    const batches = [];
    for (let i = 0; i < iterationCount; i += concurrentRequests) {
      const batch = Array.from({ length: concurrentRequests }, (_, idx) => executeIteration(i + idx));
      batches.push(Promise.all(batch));
    }

    const results = await Promise.all(batches);
    const flatResults = results.flat();
    
    expect(flatResults.length).toBe(iterationCount);
    flatResults.forEach(r => expect(r.intercepted).toBe(true));
    
    console.log("Concurrent Replay Stress Completed Successfully.");
  });

  test("Forensic Trace Propagation under Load", async () => {
    const iterationCount = 20;
    console.log(`Verifying Forensic Trace Propagation across ${iterationCount} concurrent requests...`);

    const executeIteration = async (id: number) => {
      return runInReplayMode(projectId, async () => {
        const { emitGovernanceEvent } = await import("@/lib/governance/governanceObservabilityBus");
        const { governanceLocalStorage } = await import("@/lib/governance/governanceContext");
        
        const context = governanceLocalStorage.getStore();
        const traceId = context?.traceId;
        const causalityChainId = context?.causalityChainId;

        expect(traceId).toBeDefined();
        expect(causalityChainId).toBeDefined();

        await emitGovernanceEvent({
          category: "TRACE_STRESS_TEST",
          severity: "info",
          sourceLayer: "STRESS_ENGINE",
          projectId,
          payload: { workerId: id, traceId, causalityChainId }
        });

        return { traceId, causalityChainId };
      });
    };

    const results = await Promise.all(Array.from({ length: iterationCount }, (_, i) => executeIteration(i)));
    
    // Verify that every request has a unique trace ID
    const traceIds = new Set(results.map(r => r.traceId));
    expect(traceIds.size).toBe(iterationCount);

    // Verify that every request has a unique causality chain ID
    const causalityIds = new Set(results.map(r => r.causalityChainId));
    expect(causalityIds.size).toBe(iterationCount);

    console.log("Forensic Trace Propagation Verified.");
  });

  test("Adversarial Mutation Flood Resistance", async () => {
    const floodSize = 100;
    console.log(`Starting Adversarial Mutation Flood: ${floodSize} illegal mutations...`);

    const attempts = Array.from({ length: floodSize }, async (_, idx) => {
      return runInReplayMode(projectId, async () => {
        try {
          await interceptMutation({
            mutationType: "DB_WRITE",
            sourceLayer: "ADVERSARIAL_FLOOD",
            reason: `FLOOD_ATTACK_${idx}`
          });
          return "FAILED_TO_BLOCK";
        } catch (err) {
          return "BLOCKED";
        }
      });
    });

    const results = await Promise.all(attempts);
    const blockedCount = results.filter(r => r === "BLOCKED").length;
    
    expect(blockedCount).toBe(floodSize);
    console.log(`Adversarial Mutation Flood Resistance Verified: ${blockedCount}/${floodSize} blocked.`);
  });
});
