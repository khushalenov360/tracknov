/**
 * Tracknov Intelligence Certification - Benchmark Snapshot Registry
 * Logs historical scores for verification comparisons.
 */

export interface SnapshotRecord {
  version: string;
  accuracy: number;
  recordedAt: string;
}

export class BenchmarkSnapshotRegistry {
  private static registry: Map<string, SnapshotRecord> = new Map();

  static {
    this.registry.set("1.0.0", {
      version: "1.0.0",
      accuracy: 0.968,
      recordedAt: new Date().toISOString()
    });
  }

  public static getSnapshot(version: string): SnapshotRecord | null {
    return this.registry.get(version) || null;
  }

  public static saveSnapshot(version: string, accuracy: number): void {
    this.registry.set(version, {
      version,
      accuracy,
      recordedAt: new Date().toISOString()
    });
  }

  public static listSnapshots(): SnapshotRecord[] {
    return Array.from(this.registry.values());
  }
}
