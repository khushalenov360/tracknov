/**
 * Tracknov Extraction Feedback - Alias Resolution Engine
 * Maps custom project nomenclature variants to standard parameters.
 */

export class AliasResolutionEngine {
  private static readonly ALIAS_MAP: Record<string, string> = {
    "lighting power density": "LPD",
    "lighting density": "LPD",
    "lpd limit": "LPD",
    "coefficient of performance": "COP",
    "chiller efficiency": "COP",
    "efficiency target": "COP",
    "volatile organic compound": "VOC",
    "voc limit": "VOC",
    "indoor air quality": "IAQ",
    "chilled water flow": "PRIMARY_FLOW",
    "water flow": "PRIMARY_FLOW"
  };

  /**
   * Translates descriptive text aliases into canonical parameter keys.
   */
  public static resolveAlias(alias: string): string {
    if (!alias) return "UNKNOWN";
    const clean = alias.toLowerCase().trim();
    return this.ALIAS_MAP[clean] || alias.toUpperCase();
  }
}
