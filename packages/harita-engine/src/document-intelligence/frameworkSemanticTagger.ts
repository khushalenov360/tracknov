/**
 * Tracknov Document Intelligence - Framework Semantic Tagger
 * Classifies document chunks into green building categories (e.g. Energy, Water, Materials, Indoor Quality).
 */

export class FrameworkSemanticTagger {
  private static readonly CATEGORIES = [
    { name: "ENERGY_EFFICIENCY", keywords: ["cop", "hvac", "lighting", "electricity", "kwh", "chiller", "power", "lumens", "efficiency", "cooling", "capacity", "mechanical"] },
    { name: "WATER_CONSERVATION", keywords: ["irrigation", "flush", "potable", "faucet", "shower", "greywater", "sewage", "cistern", "rainwater", "plumbing"] },
    { name: "SUSTAINABLE_MATERIALS", keywords: ["concrete", "cement", "steel", "recycle", "wood", "local", "waste", "voc"] },
    { name: "INDOOR_ENVIRONMENTAL_QUALITY", keywords: ["fresh", "air", "lux", "noise", "ventilation", "daylight", "voc", "co2"] },
  ];

  /**
   * Matches keywords in text to tag with green building categories.
   */
  public static tag(text: string): string {
    if (!text) return "GENERAL";

    const textLower = text.toLowerCase();
    let bestCategory = "GENERAL";
    let maxMatches = 0;

    for (const cat of this.CATEGORIES) {
      let matches = 0;
      for (const kw of cat.keywords) {
        const regex = new RegExp(`\\b${kw}\\b`, "g");
        matches += (textLower.match(regex) || []).length;
      }

      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = cat.name;
      }
    }

    return bestCategory;
  }
}
