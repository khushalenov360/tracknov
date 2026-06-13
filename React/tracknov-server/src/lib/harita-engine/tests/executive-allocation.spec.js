"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const executive_resource_allocation_engine_1 = require("../intelligence/executive/executive-resource-allocation-engine");
(0, vitest_1.describe)('Executive Resource Allocation Engine', () => {
    (0, vitest_1.it)('should allocate resources to highest impact tasks', () => {
        const mockContext = {
            graph: {
                evaluateGraph: () => [
                    { type: 'task', entityId: 'Task A', impact: 20, dependencies: ['CREDIT_1'], owners: ['Architect'] },
                    { type: 'task', entityId: 'Task B', impact: 10, dependencies: [], owners: ['MEP'] }
                ]
            },
            blockedCredits: ['CREDIT_1'],
            missingEvidence: []
        };
        const allocations = executive_resource_allocation_engine_1.ExecutiveResourceAllocationEngine.allocateResources(mockContext);
        (0, vitest_1.expect)(allocations).toHaveLength(2);
        (0, vitest_1.expect)(allocations[0].contributor).toBe('Architect');
        (0, vitest_1.expect)(allocations[0].task).toBe('Task A');
        (0, vitest_1.expect)(allocations[0].rationale).toContain('Unblocks dependent credits');
    });
});
