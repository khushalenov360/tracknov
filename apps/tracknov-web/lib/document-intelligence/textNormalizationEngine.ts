/**
 * Tracknov Document Intelligence - Text Normalization Engine
 * Normalizes double spaces, page break splits, bullet points, and cleans layout whitespace.
 */

export class TextNormalizationEngine {
  /**
   * Cleans text layout to restore flow, paragraphs, and lists.
   */
  public static normalizeLayout(text: string): string {
    if (!text) return "";

    let cleaned = text;

    // Replace multiple spaces with a single space
    cleaned = cleaned.replace(/[ \t]+/g, " ");

    // Standardize bullet points (e.g. *, -, •, ▪)
    cleaned = cleaned.replace(/^[ \t]*[•▪\-\*][ \t]*/gm, "• ");

    // Standardize page break identifiers or raw form feed characters
    cleaned = cleaned.replace(/\f/g, "\n[PAGE_BREAK]\n");

    // Standardize newline formatting to single \n
    cleaned = cleaned.replace(/\r\n/g, "\n");

    // Resolve double linebreaks or excessive vertical spacing (max 2 consecutive linebreaks)
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

    // Normalize spacing around headers and section labels
    cleaned = cleaned.trim();

    return cleaned;
  }
}
