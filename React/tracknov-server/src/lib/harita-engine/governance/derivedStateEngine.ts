/**
 * Authoritative implementation of the in-memory Derived State Replay Purity Model.
 * Computes derived metrics (framework readiness, risk scores, mandatory pass/fail)
 * strictly in-memory during replay reconstruction without writing to storage layers.
 */
export interface ReplayMemoryContext {
  projectId: string;
  replayTimestamp: string;
  inMemoryTables: {
    projects: Record<string, unknown>;
    credits: Array<Record<string, unknown>>;
    documents: Array<Record<string, unknown>>;
  };
}

export interface PureDerivedResult {
  totalCredits: number;
  awardedPoints: number;
  mandatoryFailedCount: number;
  computedCertificationState: string;
  isMemoryScopedOnly: boolean;
}

export function computePureDerivedStateInMemory(ctx: ReplayMemoryContext): PureDerivedResult {
  const credits = ctx.inMemoryTables.credits || [];

  let awardedPoints = 0;
  let mandatoryFailedCount = 0;

  for (const c of credits) {
    const pts = Number(c.points_awarded) || 0;
    const status = String(c.status || "PENDING");

    if (status === "APPROVED" || status === "AWARDED") {
      awardedPoints += pts;
    }
    // Check if a mandatory credit is explicitly failed or revoked
    if (status === "REJECTED" || status === "REVOKED") {
      // Check if credit is mandatory based on standard logic or metadata
      const isMandatory = c.credit_id && String(c.credit_id).includes("MANDATORY");
      if (isMandatory) {
        mandatoryFailedCount++;
      }
    }
  }

  // Determine computed certification state purely in-memory
  let computedCertificationState = "ELIGIBLE";
  if (mandatoryFailedCount > 0) {
    computedCertificationState = "BLOCKED";
  } else if (awardedPoints >= 40) { // Standard green rating threshold
    computedCertificationState = "CERTIFIED";
  }

  return {
    awardedPoints,
    computedCertificationState,
    isMemoryScopedOnly: true,
    mandatoryFailedCount,
    totalCredits: credits.length,
  };
}
