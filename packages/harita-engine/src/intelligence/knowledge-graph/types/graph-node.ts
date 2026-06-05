import { GraphNodeType } from "./graph-types";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraphData {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
}
