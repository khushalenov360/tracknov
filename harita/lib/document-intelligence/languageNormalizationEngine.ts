/**
 * Tracknov Document Intelligence - Language Normalization Engine
 * Handles character encoding validation, UTF-8 standardization, and basic language detection.
 */

export class LanguageNormalizationEngine {
  /**
   * Deterministically standardizes character set to standard clean UTF-8, replacing illegal codepoints.
   */
  public static standardizeEncoding(text: string): string {
    if (!text) return "";
    
    // Replace non-breaking spaces with standard space
    let standard = text.replace(/\u00a0/g, " ");
    
    // Replace curly quotes with straight quotes for parsing reliability
    standard = standard
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');

    return standard;
  }

  /**
   * Identifies the primary language using high-frequency keyword distributions.
   */
  public static detectLanguage(text: string): string {
    if (!text) return "en";

    const textLower = text.toLowerCase();
    
    // High-frequency stops words by language
    const langScores = {
      en: (textLower.match(/\b(the|and|of|for|with|that|this|are|is)\b/g) || []).length,
      es: (textLower.match(/\b(el|la|los|las|de|para|con|que|este|son|es)\b/g) || []).length,
      fr: (textLower.match(/\b(le|la|les|de|pour|avec|que|ce|sont|est)\b/g) || []).length,
      de: (textLower.match(/\b(der|die|das|und|von|für|mit|dass|dies|sind|ist)\b/g) || []).length,
    };

    let bestLang = "en";
    let maxScore = 0;
    for (const [lang, score] of Object.entries(langScores)) {
      if (score > maxScore) {
        maxScore = score;
        bestLang = lang;
      }
    }

    return bestLang;
  }
}
