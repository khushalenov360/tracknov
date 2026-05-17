/**
 * Tracknov Knowledge Governance - Benchmark Regression Scanner
 * Protects test suites and raises blockers if accuracy drops below target parameters.
 */

export interface RegressionReport {
  regressed: boolean;
  scoreDelta: number;
  criticalBlocker: boolean;
  message: string;
}

export class BenchmarkRegressionScanner {
  /**
   * Scans proposed release benchmark accuracy indices against a production baseline.
   */
  public static scan(
    baselineAccuracy: number,
    proposedAccuracy: number
  ): RegressionReport {
    const delta = baselineAccuracy - proposedAccuracy;

    if (delta > 0.03) {
      return {
        regressed: true,
        scoreDelta: delta,
        criticalBlocker: true,
        message: `CRITICAL REGRESSION: Accuracy degraded by ${(delta * 100).toFixed(2)}%, exceeding the 3.0% threshold.`
      };
    }

    if (delta > 0.0) {
      return {
        regressed: true,
        scoreDelta: delta,
        criticalBlocker: false,
        message: `WARNING: Minor regression of ${(delta * 100).toFixed(2)}% observed.`
      };
    }

    return {
      regressed: false,
      scoreDelta: delta,
      criticalBlocker: false,
      message: "PASS: Proposed accuracy meets or exceeds the production baseline."
    };
  }
}
