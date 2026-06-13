/**
 * Tracknov Knowledge Governance - Anomaly Cluster Analyzer
 * Groups similar correction deviations to highlight widespread conceptual misunderstandings.
 */

export interface ClusterInfo {
  clusterSize: number;
  averageEditDistance: number;
  commonField: string;
  threatLevel: "LOW" | "MEDIUM" | "HIGH";
}

export class AnomalyClusterAnalyzer {
  /**
   * Groups a batch of correction differences to evaluate coordinate threat levels.
   */
  public static analyzeClusters(
    editDistances: number[],
    fields: string[]
  ): ClusterInfo {
    const clusterSize = editDistances.length;
    if (clusterSize === 0) {
      return { clusterSize: 0, averageEditDistance: 0, commonField: "", threatLevel: "LOW" };
    }

    const averageEditDistance = editDistances.reduce((a, b) => a + b, 0) / clusterSize;
    
    // Find most frequent field
    const frequencies: Record<string, number> = {};
    let commonField = fields[0];
    let maxFreq = 0;
    fields.forEach(f => {
      frequencies[f] = (frequencies[f] || 0) + 1;
      if (frequencies[f] > maxFreq) {
        maxFreq = frequencies[f];
        commonField = f;
      }
    });

    let threatLevel: ClusterInfo["threatLevel"] = "LOW";
    if (clusterSize > 10 && averageEditDistance < 3.0) {
      threatLevel = "HIGH"; // indicates systemic targeted feedback injects
    } else if (clusterSize > 5) {
      threatLevel = "MEDIUM";
    }

    return {
      clusterSize,
      averageEditDistance,
      commonField,
      threatLevel
    };
  }
}
