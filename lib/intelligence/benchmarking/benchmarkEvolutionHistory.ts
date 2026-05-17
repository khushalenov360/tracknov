/**
 * Tracknov Knowledge Governance - Benchmark Evolution History
 * Tracks accuracy milestones over release transitions.
 */

export interface BenchmarkMilestone {
  benchmarkVersion: string;
  accuracyScore: number;
  failureRate: number;
  timestamp: string;
}

export class BenchmarkEvolutionHistory {
  private static milestones: BenchmarkMilestone[] = [];

  static {
    this.milestones.push({
      benchmarkVersion: "v1.0",
      accuracyScore: 94.2,
      failureRate: 5.8,
      timestamp: new Date().toISOString()
    });
  }

  public static addMilestone(version: string, accuracy: number): void {
    this.milestones.push({
      benchmarkVersion: version,
      accuracyScore: accuracy * 100,
      failureRate: (1.0 - accuracy) * 100,
      timestamp: new Date().toISOString()
    });
  }

  public static getHistory(): BenchmarkMilestone[] {
    return this.milestones;
  }
}
