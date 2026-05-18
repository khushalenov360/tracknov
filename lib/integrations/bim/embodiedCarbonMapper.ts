export interface MaterialCarbonSpec {
  materialId: string;
  name: string;
  volumeCuFt: number;
  carbonIntensityFactor: number; // kgCO2e/cuFt
  totalEmbodiedCarbonKg: number;
}

export class EmbodiedCarbonMapper {
  /**
   * Computes cumulative environmental impact of physical structural components
   */
  static mapEmbodiedCarbon(
    materials: { materialId: string; name: string; volumeCuFt: number }[]
  ): MaterialCarbonSpec[] {
    return materials.map((m) => {
      let carbonIntensityFactor = 12.4; // generic default

      if (m.name.toLowerCase().includes("concrete")) {
        carbonIntensityFactor = 8.5;
      } else if (m.name.toLowerCase().includes("steel")) {
        carbonIntensityFactor = 32.8;
      }

      return {
        materialId: m.materialId,
        name: m.name,
        volumeCuFt: m.volumeCuFt,
        carbonIntensityFactor,
        totalEmbodiedCarbonKg: Math.round(m.volumeCuFt * carbonIntensityFactor)
      };
    });
  }
}
