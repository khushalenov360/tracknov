import { describe, it, expect } from 'vitest';
import { ContributorPrioritizationEngine } from '../intelligence/contributor/contributor-prioritization-engine';

describe('Contributor Prioritization Engine', () => {
  it('should return strict contributor copiloting profile', () => {
    const brief = ContributorPrioritizationEngine.getBriefForRole('Architect', {});
    expect(brief.role).toBe('Architect');
    expect(brief).toHaveProperty('openTasks');
    expect(brief).toHaveProperty('blockedTasks');
    expect(brief).toHaveProperty('highestImpactTask');
    expect(brief).toHaveProperty('expectedGain');
  });
});
