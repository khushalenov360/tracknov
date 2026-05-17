/**
 * Tracknov Document Intelligence - Semantic Retrieval Engine
 * Conducts semantic vector search over document indexes with strict multi-tenant isolation.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { EvidenceEmbeddingEngine } from "./evidenceEmbeddingEngine";

export interface RetrievedChunk {
  documentId: string;
  content: string;
  relevanceScore: number;
  metadata: Record<string, unknown>;
}

export class SemanticRetrievalEngine {
  /**
   * Retrieves relevant chunks using cosine similarity calculation.
   * Multi-tenant security check: strict where filter on project_id.
   */
  public static async retrieve(
    client: SupabaseClient,
    projectId: string,
    query: string,
    limit: number = 3
  ): Promise<RetrievedChunk[]> {
    const queryVector = EvidenceEmbeddingEngine.generateMockVector(query);

    // Fetch all active embeddings for the current project
    const { data: dbEmbeddings, error } = await client
      .from("embeddings")
      .select("document_id, content, embedding, metadata")
      .eq("project_id", projectId);

    if (error || !dbEmbeddings) {
      console.error("Failed to query project embeddings:", error?.message);
      return [];
    }

    const hits: RetrievedChunk[] = [];

    for (const record of dbEmbeddings) {
      if (!record.embedding) continue;
      
      const similarity = this.cosineSimilarity(queryVector, record.embedding);

      hits.push({
        documentId: record.document_id,
        content: record.content,
        relevanceScore: Math.round(similarity * 1000) / 1000,
        metadata: record.metadata as Record<string, unknown>,
      });
    }

    // Sort by relevance score descending
    return hits
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1.0);
  }
}
