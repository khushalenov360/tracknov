import { executeDriftReconciliationCycle } from "../lib/governance/driftDaemon";

async function main() {
  console.log("Starting Enterprise Drift Reconciliation Cycle...");
  await executeDriftReconciliationCycle();
  console.log("Cycle completed.");
}

main().catch(console.error);
