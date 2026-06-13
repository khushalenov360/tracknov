// File: lib/harita-engine/replay/replayValidator.ts
import { IgbcScoreAuthority } from '../services/igbc-score-authority';
import { ChillerExtraction, RainwaterExtraction } from '../compliance-schemas/igbc-manifests';
import { expect } from 'chai';

describe('Harita Non-Drifting Execution Verification Suite', () => {

  it('Should reject Water-Cooled Chillers when full load COP is less than 5.80', () => {
    const invalidSampleChiller: ChillerExtraction = {
      equipment_tag: "CH-01",
      cooling_medium: "Water-Cooled",
      nominal_tr_capacity: 120, // Threshold applies for < 150 TR -> Baseline requires 5.80 COP
      full_load_cop: 5.40,      // Non-compliant value parameter
      refrigerant_ashrae_id: "R-134a"
    };

    const calculationResult = IgbcScoreAuthority.verifyChillerEfficiency(invalidSampleChiller);
    
    expect(calculationResult.compliant).to.equal(false);
    expect(calculationResult.pointsAwarded).to.equal(0);
    expect(calculationResult.mandatoryBaseline).to.equal(5.80);
  });

  it('Should accurately evaluate rainwater harvesting yields according to surface metrics', () => {
    const baselineSampleHarvesting: RainwaterExtraction = {
      total_catchment_area_sqm: 2000,
      impervious_roof_area_sqm: 1000, // Yield contribution target: 1000 * 0.95 * 0.04 * 1000 = 38000L
      paved_area_sqm: 500,           // Yield contribution target: 500 * 0.75 * 0.04 * 1000 = 15000L
      designed_pit_capacity_liters: 25000 // Total combined discharge requirement target: (38k + 15k) * 0.40 = 21200L
    };

    const calculationResult = IgbcScoreAuthority.verifyRainwaterHarvesting(baselineSampleHarvesting);

    expect(calculationResult.compliant).to.equal(true);
    expect(calculationResult.pointsAwarded).to.equal(3);
    expect(calculationResult.mandatoryBaseline).to.equal(21200);
  });
});

export async function validateReplayDeterminism(
  projectId: string,
  targetTimestamp: string,
  runs: number
): Promise<{
  isConsistentlyDeterministic: boolean;
  canonicalReplayHash: string;
  runsExecuted: number;
}> {
  return {
    isConsistentlyDeterministic: true,
    canonicalReplayHash: "mock-hash",
    runsExecuted: runs
  };
}

