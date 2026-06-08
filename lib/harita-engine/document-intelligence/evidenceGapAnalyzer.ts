/**
 * Tracknov Document Intelligence - Evidence Gap Analyzer
 * Analyzes uploaded document lists to identify missing critical evidence.
 */

export interface EvidenceGap {
  missingElement: string;
  creditCode: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  recommendation: string;
}

export class EvidenceGapAnalyzer {
  private static readonly REQ_SCHEMAS: Record<string, { label: string; keywords: string[] }[]> = {
    "credit-ee-01": [
      { label: "HVAC Capacity Schedule", keywords: ["chiller", "cop", "hvac", "capacity", "compressor"] },
      { label: "Energy Simulation Report", keywords: ["simulation", "energy", "kwh", "baseline", "model"] },
    ],
    "credit-mr-01": [
      { label: "Recycled Content Certificates", keywords: ["recycle", "recycled", "certificate", "invoice"] },
      { label: "EPD Declaration Documents", keywords: ["epd", "environmental product", "declaration"] },
    ],
  };

  /**
   * Evaluates text blocks from active documents to find missing evidence items.
   */
  public static analyzeGaps(creditCode: string, combinedTexts: string): EvidenceGap[] {
    const gaps: EvidenceGap[] = [];
    const schema = this.REQ_SCHEMAS[creditCode];
    
    if (!schema) return [];

    const textLower = combinedTexts.toLowerCase();

    for (const req of schema) {
      const matched = req.keywords.some(kw => textLower.includes(kw));

      if (!matched) {
        gaps.push({
          missingElement: req.label,
          creditCode,
          severity: "CRITICAL",
          recommendation: `Please upload the ${req.label} containing standard terms: ${req.keywords.slice(0, 3).join(", ")}.`,
        });
      }
    }

    return gaps;
  }
}
