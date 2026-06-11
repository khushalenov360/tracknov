import { CertificationGapEngine } from "../intelligence/certification/certification-gap-engine";

import { describe, it, expect } from 'vitest';

describe('Certification Gap Narrative Engine', () => {
  it('should generate a correct gap narrative', async () => {
    const mockContext = {
      credits: [
        { credit_code: "EDA C1", status: "BLOCKED", completion_pct: 30, points: 2 },
        { credit_code: "WE C1", status: "BLOCKED", completion_pct: 10, points: 4 },
        { credit_code: "MR C2", status: "APPROVED", completion_pct: 100, points: 60 }
      ]
    };

    const gap = await CertificationGapEngine.calculateCertificationGap("p1", mockContext);
    
    expect(gap.narrative).toContain("Gold is already secured.");
    expect(gap.narrative).toContain("6 points remain at risk.");
    expect(gap.narrative).toContain("Platinum becomes unattainable.");
    expect(gap.narrative).toContain("- EDA C1");
  });
});
