import { KnowledgeGraphData } from "./types/graph-node";

interface CacheEntry {
  graph: KnowledgeGraphData;
  timestamp: number;
  version: number;
}

export class GraphCache {
  private static cache = new Map<string, CacheEntry>();
  private static TTL = 5 * 60 * 1000; // 5 minutes

  public static get(projectId: string): KnowledgeGraphData | null {
    const entry = this.cache.get(projectId);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(projectId);
      return null;
    }
    return entry.graph;
  }

  public static set(projectId: string, graph: KnowledgeGraphData, version: number = 1) {
    this.cache.set(projectId, { graph, timestamp: Date.now(), version });
  }

  public static invalidate(projectId: string) {
    this.cache.delete(projectId);
  }

  public static clear() {
    this.cache.clear();
  }
}
