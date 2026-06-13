import { describe, it, expect } from 'vitest';
import { ExecutiveResourceAllocationEngine } from '../intelligence/executive/executive-resource-allocation-engine';

describe('Executive Resource Allocation Engine', () => {
  it('should allocate resources to highest impact tasks', () => {
    const mockContext = {
      graph: {
        evaluateGraph: () => [
          { type: 'task', entityId: 'Task A', impact: 20, dependencies: ['CREDIT_1'], owners: ['Architect'] },
          { type: 'task', entityId: 'Task B', impact: 10, dependencies: [], owners: ['MEP'] }
        ]
      } as any,
      blockedCredits: ['CREDIT_1'],
      missingEvidence: []
    };

    const allocations = ExecutiveResourceAllocationEngine.allocateResources(mockContext);
    expect(allocations).toHaveLength(2);
    expect(allocations[0].contributor).toBe('Architect');
    expect(allocations[0].task).toBe('Task A');
    expect(allocations[0].rationale).toContain('Unblocks dependent credits');
  });
});
