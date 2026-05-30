/**
 * Tracknov Extraction Feedback - Sustainability Term Resolver
 * Standardizes framework designations and ESG terminology variants.
 */

export class SustainabilityTermResolver {
  private static readonly TERM_MAP: Record<string, string> = {
    "leed v4": "LEED_V4",
    "leed v4.1": "LEED_V4_1",
    "igbc green factory": "IGBC_FACTORY",
    "igbc nb": "IGBC_NEW_BUILDINGS",
    "igbc new buildings": "IGBC_NEW_BUILDINGS",
    "ashrae 90.1": "ASHRAE_90_1",
    "ecbc": "ECBC",
    "energy conservation building code": "ECBC",
    "low emitting materials": "LOW_EMITTING"
  };

  /**
   * Resolves raw rating or standard aliases to standardized framework constants.
   */
  public static resolveTerm(term: string): string {
    if (!term) return "UNKNOWN";
    const clean = term.toLowerCase().trim();
    return this.TERM_MAP[clean] || term.toUpperCase();
  }
}
