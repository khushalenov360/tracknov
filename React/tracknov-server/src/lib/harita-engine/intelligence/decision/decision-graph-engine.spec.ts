import { describe, it, expect, beforeEach } from 'vitest';
import { DecisionGraphEngine } from './decision-graph-engine';

describe('DecisionGraphEngine', () => {
  let engine: DecisionGraphEngine;

  beforeEach(() => {
    engine = new DecisionGraphEngine();
  });

  it('identifies highest impact credit based on direct points and blocking', () => {
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
    expect(highestCredit?.entityId).toBe('c1');
    expect(highestCredit?.impact).toBe(9);
  });

  it('operates correctly with zero evidence uploaded', () => {
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
    expect(nodes.length).toBe(2);

    const highestTask = engine.getHighestImpactNode('task');
    expect(highestTask?.entityId).toBe('t1');
  });
});
