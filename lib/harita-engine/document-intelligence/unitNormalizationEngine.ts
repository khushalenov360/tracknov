/**
 * Tracknov Extraction Feedback - Unit Normalization Engine
 * Standardizes engineering and environmental unit definitions.
 */

export class UnitNormalizationEngine {
  private static readonly UNIT_MAP: Record<string, string> = {
    "kw": "kW",
    "kilowatt": "kW",
    "kilowatts": "kW",
    "cop": "COP",
    "coefficient of performance": "COP",
    "tr": "TR",
    "tons of refrigeration": "TR",
    "gpm": "gpm",
    "gallons per minute": "gpm",
    "w/sq.ft": "W/sq.ft",
    "w/sqft": "W/sq.ft",
    "watts per square foot": "W/sq.ft",
    "cfm": "cfm",
    "lps": "lps",
    "liters per second": "lps"
  };

  /**
   * Translates spelling variants to canonical unit shorthand representation.
   */
  public static normalizeUnit(unit: string): string {
    if (!unit) return "";
    const clean = unit.toLowerCase().trim().replace(/[.]/g, "");
    return this.UNIT_MAP[clean] || unit;
  }
}
