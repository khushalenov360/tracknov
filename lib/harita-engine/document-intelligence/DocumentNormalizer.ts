// packages/harita-engine/src/document-intelligence/DocumentNormalizer.ts

export class DocumentNormalizer {
  /**
   * Normalizes extracted text for better classification.
   * Cleans up excess whitespace, standardizes characters, and lowercases text for matching.
   */
  public normalizeText(rawText: string): string {
    if (!rawText) return "";

    return rawText
      .replace(/\r\n/g, "\n")
      .replace(/\n+/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  /**
   * Generates a lowercase, punctuation-stripped version of the text for keyword matching.
   */
  public generateMatchableText(normalizedText: string): string {
    return normalizedText
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
}
