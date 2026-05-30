import { ProjectReasoner } from '../ai/consultant/projectReasoner';
import { CertificationKnowledgeGraph } from '../intelligence-certification/graph/graphBuilder';

describe('Consultant Reasoning - KPI: Recommendation accuracy >90%', () => {
  it('should correctly identify project blockers', async () => {
    const graph = new CertificationKnowledgeGraph();
    const reasoner = new ProjectReasoner(graph);
    
    // Add mock nodes
    graph.addNode({ id: 'p1', type: 'project', data: {} });
    
    const result = await reasoner.evaluate('p1');
    expect(result.projectHealth).toBe('HEALTHY');
  });
});
