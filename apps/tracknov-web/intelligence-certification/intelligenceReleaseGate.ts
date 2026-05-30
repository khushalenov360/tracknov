/**
 * Tracknov Intelligence Certification - Intelligence Release Gate
 * Enforces automated quality boundaries to prevent promotion of degraded model parameters.
 */

import { SemanticQuarantineEngine } from "../lib/governance/semanticQuarantineEngine";

export interface GateReport {
  allowRelease: boolean;
  blockReason?: string;
  checks: {
    noActiveQuarantine: boolean;
    accuracyStandardMet: boolean;
    isolationVerified: boolean;
  };
}

export class IntelligenceReleaseGate {
  /**
   * Asserts deployment safety.
   */
  public static evaluateRelease(
    proposedAccuracy: number,
    isolationFailureDetected: boolean
  ): GateReport {
    // 1. Check active quarantined items with critical threat
    const activeContamination = SemanticQuarantineEngine.listQuarantined().some(
      (q: any) => q.quarantineStatus === "QUARANTINED" && q.contaminationRisk > 0.8
    );

    const noActiveQuarantine = !activeContamination;
    const accuracyStandardMet = proposedAccuracy >= 0.95;
    const isolationVerified = !isolationFailureDetected;

    const allowRelease = noActiveQuarantine && accuracyStandardMet && isolationVerified;

    let blockReason: string | undefined;
    if (!allowRelease) {
      if (!noActiveQuarantine) blockReason = "BLOCK: Active critical quarantine blocks release.";
      else if (!accuracyStandardMet) blockReason = "BLOCK: Proposed model accuracy below baseline.";
      else if (!isolationVerified) blockReason = "BLOCK: Tenant isolation leakage failure detected.";
    }

    return {
      allowRelease,
      blockReason,
      checks: {
        noActiveQuarantine,
        accuracyStandardMet,
        isolationVerified
      }
    };
  }
}
