import { describe, it, expect } from 'vitest';
import { ClarificationResolutionEngine } from '../intelligence/clarification/clarification-resolution-engine';

describe('Clarification Resolution Engine', () => {
  it('should resolve a clarification with strict structure', () => {
    const resolution = ClarificationResolutionEngine.resolveClarification({
      query: "Please provide tank capacity details.",
      projectData: {},
      creditDetails: {}
    });

    expect(resolution).toHaveProperty('rootCause');
    expect(resolution).toHaveProperty('affectedCriteria');
    expect(resolution).toHaveProperty('missingEvidence');
    expect(resolution).toHaveProperty('recommendedResponse');
    expect(resolution).toHaveProperty('acceptanceProbability');
  });
});
