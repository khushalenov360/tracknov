"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const executive_priority_engine_1 = require("../intelligence/executive/executive-priority-engine");
(0, vitest_1.describe)('Executive Priority Engine', () => {
    (0, vitest_1.it)('should identify the biggest risk correctly', () => {
        const risk = executive_priority_engine_1.ExecutivePriorityEngine.getPriority("BIGGEST_RISK", {});
        (0, vitest_1.expect)(Array.isArray(risk)).toBe(false);
        (0, vitest_1.expect)(risk.action).toBe('Missing Energy Simulation');
    });
    (0, vitest_1.it)('should provide the next action', () => {
        const action = executive_priority_engine_1.ExecutivePriorityEngine.getPriority("NEXT_ACTION", {});
        (0, vitest_1.expect)(Array.isArray(action)).toBe(false);
        (0, vitest_1.expect)(action.reason).toContain('Unblocks approval workflow');
    });
});
