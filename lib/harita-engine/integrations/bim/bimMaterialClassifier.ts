export interface ClassifiedMaterial {
  materialId: string;
  name: string;
  recycledPercentage: number;
  lowVOC: boolean;
  sustainabilityTier: "GOLD" | "SILVER" | "STANDARD";
}

export class BimMaterialClassifier {
  /**
   * Evaluates material parameters to classify structural assemblies
   */
  static classifyMaterial(materialId: string, name: string): ClassifiedMaterial {
    const lowerName = name.toLowerCase();
    let recycledPercentage = 0;
    let lowVOC = false;
    let sustainabilityTier: ClassifiedMaterial["sustainabilityTier"] = "STANDARD";

    if (lowerName.includes("steel") || lowerName.includes("metal")) {
      recycledPercentage = 45;
      sustainabilityTier = "SILVER";
    } else if (lowerName.includes("paint") || lowerName.includes("coating") || lowerName.includes("gypsum")) {
      lowVOC = true;
      sustainabilityTier = "GOLD";
      recycledPercentage = 15;
    }

    return {
      materialId,
      name,
      recycledPercentage,
      lowVOC,
      sustainabilityTier
    };
  }
}
