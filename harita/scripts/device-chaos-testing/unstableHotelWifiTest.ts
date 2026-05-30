import { NetworkChaosSimulator } from "../../benchmarks/production-chaos/networkChaosSimulator";

export function executeHotelWifiStressTest(): void {
  console.log("[CHAOS TEST] Initializing Unstable Hotel WiFi simulator (75% drop threshold)");

  const report = NetworkChaosSimulator.simulateDrops(75);
  console.log(`[CHAOS RESULTS] Dropped Packets: ${report.droppedPacketsCount}`);
  console.log(`[CHAOS RESULTS] Sync Reconnections: ${report.offlineRecoveryAttempts}`);
  console.log(`[CHAOS RESULTS] Replay Drift: ${report.integrityDriftRatio.toFixed(5)}%`);

  if (report.integrityDriftRatio === 0) {
    console.log("[STATUS] PASS: Perfect integrity under high packet dropout.");
  } else {
    throw new Error("[FAILURE] Replay drift detected during network stress test!");
  }
}

// Automatically trigger test on direct node execution
if (require.main === module) {
  executeHotelWifiStressTest();
}
