/**
 * Tracknov Document Intelligence - Clarification Context Engine
 * Links active submittals and clarification contexts to historical audit approval traces.
 */

export interface ClarificationResolutionPattern {
  issueDescription: string;
  historicalResolution: string;
  relevanceScore: number;
}

export class ClarificationContextEngine {
  private static readonly ISSUE_PATTERNS = [
    {
      keywords: ["hvac", "cop", "chiller", "efficiency"],
      issueDescription: "HVAC schedule missing explicit COP efficiency values at design parameters.",
      historicalResolution: "Request mechanical datasheets with certified performance curves or submittal validation letters.",
    },
    {
      keywords: ["lighting", "power density", "lpd", "lux"],
      issueDescription: "Lighting Power Density exceeds maximum allowable limits under ECBC guidelines.",
      historicalResolution: "Advise replacing standard lamps with energy-efficient LED fixtures, updating lux calculations.",
    },
    {
      keywords: ["recycle", "content", "material"],
      issueDescription: "Recycled content documentation missing manufacturer EPD declarations.",
      historicalResolution: "Submit official manufacturer invoices along with certified Environmental Product Declarations (EPDs).",
    },
  ];

  /**
   * Matches document context against unresolved issue patterns to advise resolution path.
   */
  public static findResolutionPattern(text: string): ClarificationResolutionPattern[] {
    const textLower = text.toLowerCase();
    const suggestions: ClarificationResolutionPattern[] = [];

    for (const pattern of this.ISSUE_PATTERNS) {
      const matchCount = pattern.keywords.filter(kw => textLower.includes(kw)).length;
      if (matchCount > 0) {
        suggestions.push({
          issueDescription: pattern.issueDescription,
          historicalResolution: pattern.historicalResolution,
          relevanceScore: matchCount / pattern.keywords.length,
        });
      }
    }

    return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
