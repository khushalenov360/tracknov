"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BimMaterialClassifier = void 0;
class BimMaterialClassifier {
    /**
     * Evaluates material parameters to classify structural assemblies
     */
    static classifyMaterial(materialId, name) {
        const lowerName = name.toLowerCase();
        let recycledPercentage = 0;
        let lowVOC = false;
        let sustainabilityTier = "STANDARD";
        if (lowerName.includes("steel") || lowerName.includes("metal")) {
            recycledPercentage = 45;
            sustainabilityTier = "SILVER";
        }
        else if (lowerName.includes("paint") || lowerName.includes("coating") || lowerName.includes("gypsum")) {
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
exports.BimMaterialClassifier = BimMaterialClassifier;
