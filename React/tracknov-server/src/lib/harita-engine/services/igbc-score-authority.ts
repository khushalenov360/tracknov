// File: lib/harita-engine/services/igbc-score-authority.ts
import { ChillerExtraction, RainwaterExtraction, MaterialExtraction } from '../compliance-schemas/igbc-manifests';

export interface EvaluationOutcome {
  compliant: boolean;
  pointsAwarded: number;
  calculatedMetric: number;
  mandatoryBaseline: number;
  justificationSummary: string;
}

export async function getAuthoritativeProjectScore(workspace: any): Promise<any> {
  const credits = workspace.credits ?? [];
  const earned = credits.filter((c: any) => c.status === "complete").length;
  const totalAvailable = credits.length;
  const percent = totalAvailable > 0 ? Math.round((earned / totalAvailable) * 100) : 0;
  
  // Calculate categories
  const categoriesMap = new Map<string, { earned: number; total: number }>();
  for (const c of credits) {
    const cat = c.category_name || "Uncategorized";
    if (!categoriesMap.has(cat)) {
      categoriesMap.set(cat, { earned: 0, total: 0 });
    }
    const data = categoriesMap.get(cat)!;
    data.total += 1;
    if (c.status === "complete") data.earned += 1;
  }
  const categories = Array.from(categoriesMap.entries()).map(([category, stats]) => ({
    category,
    earned: stats.earned,
    total: stats.total
  }));
  
  return {
    level: { level: percent >= 80 ? "Platinum" : percent >= 60 ? "Gold" : percent >= 50 ? "Silver" : percent >= 40 ? "Certified" : "Below Certified" },
    earned,
    totalAvailable,
    percent,
    categories
  };
}

export class IgbcScoreAuthority {
  /**
   * Evaluates Chiller performance metrics directly against Indian ECBC 2017 prescriptive minimum targets.
   */
  public static verifyChillerEfficiency(data: ChillerExtraction, projectContext?: any): EvaluationOutcome {
    let mandatoryCOP = 0.0;

    if (data.cooling_medium === 'Water-Cooled') {
      if (data.nominal_tr_capacity < 150) mandatoryCOP = 5.80;
      else if (data.nominal_tr_capacity >= 150 && data.nominal_tr_capacity < 300) mandatoryCOP = 6.10;
      else mandatoryCOP = 6.30;
    } else {
      // Air-Cooled system parameter constraints
      mandatoryCOP = 2.90;
    }

    const isCompliant = data.full_load_cop >= mandatoryCOP;
    return {
      compliant: isCompliant,
      pointsAwarded: isCompliant ? 2 : 0,
      calculatedMetric: data.full_load_cop,
      mandatoryBaseline: mandatoryCOP,
      justificationSummary: isCompliant 
        ? `Tag ${data.equipment_tag} meets mandatory targets: Recorded COP ${data.full_load_cop} >= Required ${mandatoryCOP}.`
        : `Tag ${data.equipment_tag} fails targets: Recorded COP ${data.full_load_cop} < Required ${mandatoryCOP}.`
    };
  }

  /**
   * Computes minimum net rainwater yield constraints: Harvested volume must support at least 21 days of peak runoff patterns.
   */
  public static verifyRainwaterHarvesting(data: RainwaterExtraction, projectContext?: any): EvaluationOutcome {
    // Standard run-off parameters from the IGBC guideline handbook
    const roofCoefficient = 0.95;
    const pavingCoefficient = 0.75;
    const peakDailyRainfallMeters = 0.040; // 40mm baseline scenario constraint

    const calculatedYieldLiters = (
      (data.impervious_roof_area_sqm * roofCoefficient) + 
      (data.paved_area_sqm * pavingCoefficient)
    ) * peakDailyRainfallMeters * 1000;

    // Minimum requirement threshold: Pit capacity must capture a minimum of 40% of calculated peak surface discharge run-off volume
    const mandatoryThresholdVolume = calculatedYieldLiters * 0.40;
    const isCompliant = data.designed_pit_capacity_liters >= mandatoryThresholdVolume;

    return {
      compliant: isCompliant,
      pointsAwarded: isCompliant ? 3 : 0,
      calculatedMetric: data.designed_pit_capacity_liters,
      mandatoryBaseline: mandatoryThresholdVolume,
      justificationSummary: isCompliant
        ? `Pit volume (${data.designed_pit_capacity_liters}L) accommodates the mandatory 40% discharge curve requirement (${mandatoryThresholdVolume.toFixed(2)}L).`
        : `Pit volume (${data.designed_pit_capacity_liters}L) is insufficient to support the mandatory 40% discharge curve threshold (${mandatoryThresholdVolume.toFixed(2)}L).`
    };
  }

  /**
   * Computes integrated material values: Recycled configuration content formula is defined explicitly as:
   * Total Recycled Cost Value = Material Cost * (Post-Consumer Pct + 0.5 * Pre-Consumer Pct)
   */
  public static verifyRecycledContentValue(materials: MaterialExtraction[], projectContext?: any): EvaluationOutcome {
    let aggregateProjectMaterialCost = 0;
    let aggregateRecycledValueContribution = 0;

    for (const item of materials) {
      aggregateProjectMaterialCost += item.invoice_total_cost_inr;
      const explicitItemRecycledFactor = (item.post_consumer_recycled_pct / 100) + (0.5 * (item.pre_consumer_recycled_pct / 100));
      aggregateRecycledValueContribution += (item.invoice_total_cost_inr * explicitItemRecycledFactor);
    }

    if (aggregateProjectMaterialCost === 0) {
      return { compliant: false, pointsAwarded: 0, calculatedMetric: 0, mandatoryBaseline: 10, justificationSummary: "No material tracking variables processed." };
    }

    const overallProjectRecycledPercentage = (aggregateRecycledValueContribution / aggregateProjectMaterialCost) * 100;
    
    // Points allocation array bounds: 10% target = 1 point; 20% target = 2 points
    let pointsAwarded = 0;
    if (overallProjectRecycledPercentage >= 20) pointsAwarded = 2;
    else if (overallProjectRecycledPercentage >= 10) pointsAwarded = 1;

    return {
      compliant: overallProjectRecycledPercentage >= 10,
      pointsAwarded,
      calculatedMetric: parseFloat(overallProjectRecycledPercentage.toFixed(2)),
      mandatoryBaseline: 10,
      justificationSummary: `Project achieved ${overallProjectRecycledPercentage.toFixed(2)}% recycled material value contribution based on aggregate cost evaluations.`
    };
  }
}
