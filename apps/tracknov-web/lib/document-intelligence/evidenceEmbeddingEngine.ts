/**
 * Tracknov Document Intelligence - Evidence Embedding Engine
 * Registers semantic chunk index metadata into the embeddings table.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface ChunkEmbeddingPayload {
  projectId: string;
  frameworkVersion: string;
  documentId: string;
  sectionTitle: string;
  semanticCategory: string;
  replayHash: string;
  traceId: string;
  causalityChainId: string;
  chunkText: string;
}

export class EvidenceEmbeddingEngine {
  /**
   * Deterministically calculates mock embedding vectors for local development/testing to retain replay purity.
   */
  public static generateMockVector(text: string): number[] {
    const vectorSize = 384;
    const vector = new Array(vectorSize).fill(0);
    
    // Deterministic generation from text content
    for (let i = 0; i < text.length; i++) {
      const idx = i % vectorSize;
      vector[idx] += text.charCodeAt(i) * 0.001;
    }

    // Normalize vector
    let magnitude = 0;
    for (const val of vector) {
      magnitude += val * val;
    }
    magnitude = Math.sqrt(magnitude) || 1.0;

    return vector.map(v => v / magnitude);
  }

  /**
   * Registers a chunk's text, computed vectors, and metadata in the public.embeddings database table.
   */
  public static async registerChunk(
    client: SupabaseClient,
    payload: ChunkEmbeddingPayload
  ): Promise<boolean> {
    const vector = this.generateMockVector(payload.chunkText);

    // Save to public.embeddings
    const { error } = await client
      .from("embeddings")
      .insert({
        project_id: payload.projectId,
        document_id: payload.documentId,
        content: payload.chunkText,
        embedding: vector,
        metadata: {
          sectionTitle: payload.sectionTitle,
          semanticCategory: payload.semanticCategory,
          frameworkVersion: payload.frameworkVersion,
          replayHash: payload.replayHash,
          traceId: payload.traceId,
          causalityChainId: payload.causalityChainId,
        },
      });

    if (error) {
      console.error("Failed to register chunk embedding:", error.message);
      return false;
    }

    return true;
  }
}
