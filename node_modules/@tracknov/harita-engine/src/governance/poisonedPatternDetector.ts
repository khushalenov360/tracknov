/**
 * Tracknov Knowledge Governance - Poisoned Pattern Detector
 * Identifies fast repetitive feedback loops that may imply adversarial gaming or feedback gaming.
 */

export interface PoisonAlert {
  poisoned: boolean;
  score: number;
  message: string;
}

export class PoisonedPatternDetector {
  /**
   * Scans correction intervals to identify fast spam cycles or semantic poisoning attempts.
   */
  public static scanFeedbackIntervals(
    correctionCount: number,
    timespanSeconds: number
  ): PoisonAlert {
    if (timespanSeconds === 0) {
      return { poisoned: false, score: 0, message: "Valid execution timespan." };
    }

    const operationsPerSecond = correctionCount / timespanSeconds;

    // Trigger high alert if a single user logs > 5 corrections per second
    if (operationsPerSecond > 5.0) {
      return {
        poisoned: true,
        score: 0.95,
        message: "POISON_ALERT: Extremely high correction rate. Restricting feedback learning stream."
      };
    }

    if (operationsPerSecond > 2.0) {
      return {
        poisoned: true,
        score: 0.72,
        message: "POISON_ALERT: Anomalous feedback loop frequency detected. Flagging for quarantine review."
      };
    }

    return {
      poisoned: false,
      score: operationsPerSecond * 0.1,
      message: "CLEAN: Learning loops operating within standard limits."
    };
  }
}
