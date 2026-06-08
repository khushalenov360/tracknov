/**
 * Tracknov Extraction Feedback - Manufacturer Normalization Engine
 * Normalizes vendor name aliases and variations into a canonical representation.
 */

export class ManufacturerNormalizationEngine {
  private static readonly CANONICAL_MAP: Record<string, string> = {
    "daikin": "DAIKIN",
    "daikin industries": "DAIKIN",
    "daikin europe": "DAIKIN",
    "carrier": "CARRIER",
    "carrier corporation": "CARRIER",
    "trane": "TRANE",
    "trane technologies": "TRANE",
    "siemens": "SIEMENS",
    "siemens ag": "SIEMENS",
    "honeywell": "HONEYWELL",
    "honeywell international": "HONEYWELL",
    "johnson controls": "JOHNSON_CONTROLS",
    "johnson": "JOHNSON_CONTROLS",
    "jci": "JOHNSON_CONTROLS",
    "blue star": "BLUE_STAR",
    "lg": "LG",
    "lg electronics": "LG",
    "voltas": "VOLTAS",
  };

  /**
   * Resolves raw manufacturer names to canonical supplier representatives.
   */
  public static normalize(rawName: string): string {
    if (!rawName) return "UNKNOWN";

    const clean = rawName.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

    // 1. Check exact match
    if (this.CANONICAL_MAP[clean]) {
      return this.CANONICAL_MAP[clean];
    }

    // 2. Check contains match
    for (const [alias, canonical] of Object.entries(this.CANONICAL_MAP)) {
      if (clean.includes(alias) || alias.includes(clean)) {
        return canonical;
      }
    }

    return rawName.toUpperCase();
  }
}
