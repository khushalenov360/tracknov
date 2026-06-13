"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const decision_graph_engine_1 = require("./decision-graph-engine");
(0, vitest_1.describe)('DecisionGraphEngine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new decision_graph_engine_1.DecisionGraphEngine();
    });
    (0, vitest_1.it)('identifies highest impact credit based on direct points and blocking', () => {
        engine.addCredit({
            id: 'c1',
            code: 'EDA C1',
            certificationImpact: 3,
            dependsOn: [],
            blocks: ['c2', 'c3'],
            owners: ['Architect']
        });
        engine.addCredit({
            id: 'c2',
            code: 'WC C1',
            certificationImpact: 2,
            dependsOn: ['c1'],
            blocks: [],
            owners: ['PM']
        });
        engine.addCredit({
            id: 'c3',
            code: 'IE C2',
            certificationImpact: 4,
            dependsOn: ['c1'],
            blocks: [],
            owners: ['Contractor']
        });
        const nodes = engine.evaluateGraph();
        const highestCredit = engine.getHighestImpactNode('credit');
        // c1 impact = 3 (itself) + 2 (c2) + 4 (c3) = 9
        (0, vitest_1.expect)(highestCredit === null || highestCredit === void 0 ? void 0 : highestCredit.entityId).toBe('c1');
        (0, vitest_1.expect)(highestCredit === null || highestCredit === void 0 ? void 0 : highestCredit.impact).toBe(9);
    });
    (0, vitest_1.it)('operates correctly with zero evidence uploaded', () => {
        engine.addCredit({
            id: 'c1',
            code: 'EDA C1',
            certificationImpact: 3,
            dependsOn: [],
            blocks: [],
            owners: ['Architect']
        });
        engine.addTask({
            id: 't1',
            description: 'EDA C1 Calculation Sheet',
            advances: 'c1',
            owners: ['Architect']
        });
        // Zero evidence added!
        const nodes = engine.evaluateGraph();
        (0, vitest_1.expect)(nodes.length).toBe(2);
        const highestTask = engine.getHighestImpactNode('task');
        (0, vitest_1.expect)(highestTask === null || highestTask === void 0 ? void 0 : highestTask.entityId).toBe('t1');
    });
});
