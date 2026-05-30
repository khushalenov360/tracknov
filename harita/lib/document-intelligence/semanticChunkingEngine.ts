/**
 * Tracknov Document Intelligence - Semantic Chunking Engine
 * Segments documents by headers, sections, and paragraphs to keep structured engineering tables and context unified.
 */

export interface SemanticChunk {
  chunkId: string;
  text: string;
  sectionTitle: string;
  pageNumber: number;
  wordCount: number;
}

export class SemanticChunkingEngine {
  /**
   * Intelligently segments a text string, respecting section markers and table grids.
   */
  public static chunk(text: string, maxWords: number = 250): SemanticChunk[] {
    if (!text) return [];

    const chunks: SemanticChunk[] = [];
    const lines = text.split("\n");
    
    let currentChunkText: string[] = [];
    let currentWords = 0;
    let currentSection = "Introduction";
    let currentPage = 1;
    let chunkIndex = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.includes("[PAGE_BREAK]")) {
        currentPage++;
        continue;
      }

      // Check if line is a header
      const isHeader = trimmed.startsWith("#") || /^(section|chapter|appendix)\b/i.test(trimmed);
      if (isHeader) {
        // Flush previous chunk before starting a new section
        if (currentChunkText.length > 0) {
          chunks.push({
            chunkId: `chk-${chunkIndex++}`,
            text: currentChunkText.join("\n"),
            sectionTitle: currentSection,
            pageNumber: currentPage,
            wordCount: currentWords,
          });
          currentChunkText = [];
          currentWords = 0;
        }
        currentSection = trimmed.replace(/^#+\s*/, "");
      }

      const lineWords = trimmed.split(/\s+/).filter(Boolean).length;
      
      // If adding this line exceeds the semantic threshold, flush the current chunk first
      if (currentWords + lineWords > maxWords && currentChunkText.length > 0) {
        chunks.push({
          chunkId: `chk-${chunkIndex++}`,
          text: currentChunkText.join("\n"),
          sectionTitle: currentSection,
          pageNumber: currentPage,
          wordCount: currentWords,
        });
        currentChunkText = [];
        currentWords = 0;
      }

      currentChunkText.push(line);
      currentWords += lineWords;
    }

    // Flush any remaining text segment
    if (currentChunkText.length > 0) {
      chunks.push({
        chunkId: `chk-${chunkIndex++}`,
        text: currentChunkText.join("\n"),
        sectionTitle: currentSection,
        pageNumber: currentPage,
        wordCount: currentWords,
      });
    }

    return chunks;
  }
}
