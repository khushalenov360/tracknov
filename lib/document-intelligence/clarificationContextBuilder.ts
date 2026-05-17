/**
 * Tracknov Document Intelligence - AI Clarification Context Builder
 * Assembles a unified context record representing all historical submittals and EPD standards.
 */

import { RetrievedChunk } from "./semanticRetrievalEngine";
import { ClarificationResolutionPattern } from "./clarificationContextEngine";

export interface UnifiedClarificationContext {
  projectId: string;
  documentId: string;
  semanticCategory: string;
  matchedKeywords: string[];
  relevantHistory: RetrievedChunk[];
  suggestedResolutions: ClarificationResolutionPattern[];
  timestamp: string;
}

export class ClarificationContextBuilder {
  /**
   * Orchestrates the compilation of a high-fidelity context packet for the AI execution layers.
   */
  public static build(
    projectId: string,
    documentId: string,
    semanticCategory: string,
    text: string,
    history: RetrievedChunk[],
    resolutions: ClarificationResolutionPattern[]
  ): UnifiedClarificationContext {
    const textLower = text.toLowerCase();
    
    // Scan high-importance keywords
    const keywordsList = ["cop", "lux", "epd", "voc", "ventilation", "chiller", "flow", "recycled"];
    const matchedKeywords = keywordsList.filter(kw => textLower.includes(kw));

    return {
      projectId,
      documentId,
      semanticCategory,
      matchedKeywords,
      relevantHistory: history.slice(0, 3), // Limit history items to avoid context overflow
      suggestedResolutions: resolutions,
      timestamp: new Date().toISOString(),
    };
  }
}
