import { generateExecutiveBrief } from "../ai/planners/executiveBriefPlanner";

import { describe, it, expect } from 'vitest';

describe('Executive Brief Planner', () => {
  it('should generate an executive priority brief', () => {
    const mockReasoning = {
      evidence: JSON.stringify([{
        title: "Resubmit EDA C1 rejected evidence",
        owner: "Architect",
        urgency: 100,
        rationale: "This rejection is currently blocking certification progress and preventing stage advancement."
      }])
    };

    const brief = generateExecutiveBrief(mockReasoning, "EXECUTIVE_PRIORITY");
    
    expect(brief.primaryAction.title).toContain("Resubmit");
    expect(brief.primaryAction.owner).toBe("Architect");
    expect(brief.businessImpact.length).toBeGreaterThan(0);
    expect(brief.recommendations.length).toBeGreaterThan(0);
  });
});
