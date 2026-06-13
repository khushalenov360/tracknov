/**
 * Tracknov Document Intelligence - Semantic Duplicate Detector
 * Cross-references newly uploaded text against historical project documents to block evidence reuse.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { SemanticRetrievalEngine } from "../intelligence/retrieval/semanticRetrievalEngine";

export interface DuplicateReport {
  isDuplicate: boolean;
  duplicateDocumentId?: string;
  highestSimilarity: number;
  matchingSnippet?: string;
}

export class SemanticDuplicateDetector {
  /**
   * Compares high-relevance matches across project to identify duplicates.
   */
  public static async detect(
    client: SupabaseClient,
    projectId: string,
    sampleText: string,
    excludeDocumentId?: string
  ): Promise<DuplicateReport> {
    if (!sampleText || sampleText.trim().length < 50) {
      return { isDuplicate: false, highestSimilarity: 0.0 };
    }

    // Retrieve closest semantic chunks from database
    const matches = await SemanticRetrievalEngine.retrieve(client, projectId, sampleText, 5);

    for (const match of matches) {
      if (excludeDocumentId && match.documentId === excludeDocumentId) {
        continue;
      }

      // If the relevance similarity is above 0.95, it's virtually a copy-paste duplicate
      if (match.relevanceScore > 0.95) {
        return {
          isDuplicate: true,
          duplicateDocumentId: match.documentId,
          highestSimilarity: match.relevanceScore,
          matchingSnippet: match.content.substr(0, 150) + "...",
        };
      }
    }

    return {
      isDuplicate: false,
      highestSimilarity: matches.length > 0 ? matches[0].relevanceScore : 0.0,
    };
  }
}
