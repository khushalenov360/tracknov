import { describe, it, expect } from 'vitest';
import { certificationStrategyEngine } from '../services/certification-strategy-engine';

describe('Certification Strategy Engine', () => {
  it('should calculate high ROI credits correctly', () => {
    const mockCredits = [
      { credit_code: 'A', state: 'pending', max_points: 10, probability: 0.9 }, // ROI: 9
      { credit_code: 'B', state: 'pending', max_points: 5, probability: 0.5 },  // ROI: 2.5
      { credit_code: 'C', state: 'pending', max_points: 20, probability: 0.8 }  // ROI: 16
    ];

    const strategy = certificationStrategyEngine.getStrategy(mockCredits);
    expect(strategy.highRoiCredits).toBeDefined();
    expect(strategy.highRoiCredits![0].credit).toBe('C');
    expect(strategy.highRoiCredits![1].credit).toBe('A');
  });
});
