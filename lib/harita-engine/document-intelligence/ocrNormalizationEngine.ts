/**
 * Tracknov Document Intelligence - OCR Normalization Engine
 * Replaces common OCR mistakes, standardizes typographies, and handles scanned text normalization.
 */

export class OcrNormalizationEngine {
  // Map of common OCR misread character sequences
  private static readonly REPLACEMENTS: Record<string, string> = {
    "ﬁ": "fi",
    "ﬂ": "fl",
    "|": "I",
    "rn": "m", // 'rn' read as 'm' or vice versa
    "cl": "d",
    "vv": "w",
    "1ll": "ill",
    "0o": "oo",
    "C02": "CO2",
    "c02": "CO2",
    "kw": "kW",
    "hvac": "HVAC",
    "btu": "BTU",
    "igbc": "IGBC",
    "leed": "LEED",
  };

  /**
   * Cleans OCR raw output text and recovers structure.
   */
  public static normalize(rawText: string): string {
    if (!rawText) return "";

    let normalized = rawText;

    // Apply regex-based character replacements
    for (const [target, replacement] of Object.entries(this.REPLACEMENTS)) {
      const escapedTarget = target.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedTarget, "g");
      normalized = normalized.replace(regex, replacement);
    }

    // Correct split words like "docu- ment" or "en- vironment" at line breaks
    normalized = normalized.replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2");

    // Clean up control and garbage character sequences often introduced by low confidence scans
    normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");

    return normalized;
  }
}
