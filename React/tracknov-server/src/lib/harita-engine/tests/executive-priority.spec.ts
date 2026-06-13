import { describe, it, expect } from 'vitest';
import { ExecutivePriorityEngine } from '../intelligence/executive/executive-priority-engine';

describe('Executive Priority Engine', () => {
  it('should identify the biggest risk correctly', () => {
    const risk = ExecutivePriorityEngine.getPriority("BIGGEST_RISK", {});
    expect(Array.isArray(risk)).toBe(false);
    expect((risk as any).action).toBe('Missing Energy Simulation');
  });

  it('should provide the next action', () => {
    const action = ExecutivePriorityEngine.getPriority("NEXT_ACTION", {});
    expect(Array.isArray(action)).toBe(false);
    expect((action as any).reason).toContain('Unblocks approval workflow');
  });
});
