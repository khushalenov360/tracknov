export interface GraphNode {
  id: string;
  type: 'project' | 'credit' | 'stage' | 'submittal' | 'evidence' | 'clarification' | 'validation';
  data: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: 'belongs_to' | 'depends_on' | 'impacts' | 'resolves' | 'validates';
  weight?: number;
}

export class CertificationKnowledgeGraph {
  nodes: Map<string, GraphNode> = new Map();
  edges: GraphEdge[] = [];

  addNode(node: GraphNode) {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: GraphEdge) {
    this.edges.push(edge);
  }

  getNode(id: string) {
    return this.nodes.get(id);
  }

  getEdgesFrom(sourceId: string) {
    return this.edges.filter((e) => e.source === sourceId);
  }

  getEdgesTo(targetId: string) {
    return this.edges.filter((e) => e.target === targetId);
  }
}

export async function buildProjectGraph(projectId: string, supabaseAdmin: any): Promise<CertificationKnowledgeGraph> {
  const graph = new CertificationKnowledgeGraph();

  // Fetch all related entities in parallel
  const [
    { data: project },
    { data: credits },
    { data: submittals },
    { data: evidence },
  ] = await Promise.all([
    supabaseAdmin.from('projects').select('*').eq('id', projectId).single(),
    supabaseAdmin.from('project_credits').select('*').eq('project_id', projectId),
    supabaseAdmin.from('tasks').select('*').eq('project_id', projectId),
    supabaseAdmin.from('project_document').select('*').eq('project_id', projectId),
  ]);

  if (!project) return graph;

  graph.addNode({ id: project.id, type: 'project', data: project });

  for (const credit of credits || []) {
    graph.addNode({ id: credit.id, type: 'credit', data: credit });
    graph.addEdge({ source: credit.id, target: project.id, relationship: 'belongs_to' });
  }

  for (const submittal of submittals || []) {
    graph.addNode({ id: submittal.id, type: 'submittal', data: submittal });
    if (submittal.project_credit_id) {
      graph.addEdge({ source: submittal.id, target: submittal.project_credit_id, relationship: 'belongs_to' });
    }
  }

  for (const doc of evidence || []) {
    graph.addNode({ id: doc.id, type: 'evidence', data: doc });
    if (doc.task_id) {
      graph.addEdge({ source: doc.id, target: doc.task_id, relationship: 'belongs_to' });
    }
  }

  return graph;
}
