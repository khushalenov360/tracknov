import { governanceIncidents } from "@tracknov/harita-engine/governance/governanceIncidentEngine";
import { acquireReplayLock } from "@tracknov/harita-engine/governance/replayConflictResolutionEngine";
import { validateOverrideSafety } from "@tracknov/harita-engine/governance/overrideSafetyEngine";
import { collectGovernanceHealthMetrics } from "@tracknov/harita-engine/governance/governanceHealthMonitor";
import { generateDriftAnalyticsReport } from "@tracknov/harita-engine/governance/driftAnalyticsEngine";
import { detectRuntimeEntropy } from "@tracknov/harita-engine/governance/runtimeEntropyEngine";
import { governanceLocalStorage } from "@tracknov/harita-engine/governance/governanceContext";
import crypto from "node:crypto";

const PROJECT_ID = "b73d7310-df16-4d26-b6c8-61bebb197410";
const ACTOR_ID = "c6a2e4e1-7d1a-4c1a-8c1a-7d1a4c1a8c1a"; // Dummy actor

async function seed() {
  console.log("Starting Governance Resilience Seeding...");

  // Mock context
  const traceId = crypto.randomUUID();
  
  // We need to simulate the AsyncLocalStorage behavior if possible, 
  // or just call the engines directly if they allow passing project IDs.
  // The current engines use the store, so we must run within it.
  
  await (governanceLocalStorage as any).run({ traceId, actorId: ACTOR_ID, projectId: PROJECT_ID }, async () => {
    
    console.log("1. Reporting Incidents...");
    await governanceIncidents.replayConflict(PROJECT_ID, { collisionAt: new Date().toISOString() });
    await governanceIncidents.staleApproval(PROJECT_ID, ACTOR_ID);
    await governanceIncidents.entropyWarning(PROJECT_ID, { variance: 0.15 });

    console.log("2. Testing Replay Locks...");
    await acquireReplayLock(PROJECT_ID);

    console.log("3. Validating Override Safety...");
    try {
      await validateOverrideSafety({
        projectId: PROJECT_ID,
        overrideType: "MANUAL_CREDIT_ADJUSTMENT",
        reason: "Manual correction for missing evidentiary artifacts in L1 submittal.",
        actorId: ACTOR_ID,
        targetTimestamp: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Override validation failed (expected if DB state is complex):", e.message);
    }

    console.log("4. Collecting Health Metrics...");
    await collectGovernanceHealthMetrics(PROJECT_ID);

    console.log("5. Generating Drift Analytics...");
    await generateDriftAnalyticsReport(PROJECT_ID);

    console.log("6. Detecting Runtime Entropy...");
    await detectRuntimeEntropy(PROJECT_ID);

    console.log("Seeding Complete.");
  });
}

seed().catch(e => {
  console.error("Seeding failed:", e);
  process.exit(1);
});
