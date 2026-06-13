/**
 * Tracknov Document Intelligence - Embedding Lifecycle Management
 * Enforces vector retention policies, eliminates stale indexes, and limits duplicate vector growth.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export class EmbeddingLifecycle {
  private static readonly MAX_VECTOR_LIMIT_PER_PROJECT = 5000;

  /**
   * Evaluates if a document needs embedding rebuild based on state modification timestamp.
   */
  public static shouldRebuildEmbedding(
    lastCalculated: string | null,
    documentLastModified: string
  ): boolean {
    if (!lastCalculated) return true;
    const calcTime = new Date(lastCalculated).getTime();
    const modTime = new Date(documentLastModified).getTime();
    return modTime > calcTime;
  }

  /**
   * Purges orphan or stale embeddings that are no longer linked to active project documents.
   */
  public static async purgeStaleEmbeddings(client: SupabaseClient): Promise<number> {
    // Select orphan embeddings that don't match any existing document ID
    const { data: orphans, error: selectError } = await client
      .from("embeddings")
      .select("id, document_id");

    if (selectError || !orphans) {
      console.error("Embedding purge check failed:", selectError?.message);
      return 0;
    }

    let purgedCount = 0;
    for (const record of orphans) {
      if (!record.document_id) continue;
      
      const { data: exists } = await client
        .from("project_document")
        .select("id")
        .eq("id", record.document_id)
        .maybeSingle();

      if (!exists) {
        await client.from("embeddings").delete().eq("id", record.id);
        purgedCount++;
      }
    }

    return purgedCount;
  }

  /**
   * Enforces hard limits on the vector storage footprint to prevent infinite vector sprawl.
   */
  public static async enforceVectorLimits(
    client: SupabaseClient,
    projectId: string
  ): Promise<boolean> {
    const { count, error } = await client
      .from("embeddings")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (error) {
      console.error("Vector quota fetch error:", error.message);
      return false;
    }

    const totalVectors = count ?? 0;
    if (totalVectors >= this.MAX_VECTOR_LIMIT_PER_PROJECT) {
      console.warn(`[EMBEDDING_LIMIT] Project ${projectId} has reached the hard quota of ${this.MAX_VECTOR_LIMIT_PER_PROJECT} vectors.`);
      return false; // Quota exceeded, reject embedding generation
    }

    return true;
  }
}
