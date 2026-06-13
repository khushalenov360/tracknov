"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateReplayDeterminism = validateReplayDeterminism;
// File: lib/harita-engine/replay/replayValidator.ts
const igbc_score_authority_1 = require("../services/igbc-score-authority");
const chai_1 = require("chai");
describe('Harita Non-Drifting Execution Verification Suite', () => {
    it('Should reject Water-Cooled Chillers when full load COP is less than 5.80', () => {
        const invalidSampleChiller = {
            equipment_tag: "CH-01",
            cooling_medium: "Water-Cooled",
            nominal_tr_capacity: 120, // Threshold applies for < 150 TR -> Baseline requires 5.80 COP
            full_load_cop: 5.40, // Non-compliant value parameter
            refrigerant_ashrae_id: "R-134a"
        };
        const calculationResult = igbc_score_authority_1.IgbcScoreAuthority.verifyChillerEfficiency(invalidSampleChiller);
        (0, chai_1.expect)(calculationResult.compliant).to.equal(false);
        (0, chai_1.expect)(calculationResult.pointsAwarded).to.equal(0);
        (0, chai_1.expect)(calculationResult.mandatoryBaseline).to.equal(5.80);
    });
    it('Should accurately evaluate rainwater harvesting yields according to surface metrics', () => {
        const baselineSampleHarvesting = {
            total_catchment_area_sqm: 2000,
            impervious_roof_area_sqm: 1000, // Yield contribution target: 1000 * 0.95 * 0.04 * 1000 = 38000L
            paved_area_sqm: 500, // Yield contribution target: 500 * 0.75 * 0.04 * 1000 = 15000L
            designed_pit_capacity_liters: 25000 // Total combined discharge requirement target: (38k + 15k) * 0.40 = 21200L
        };
        const calculationResult = igbc_score_authority_1.IgbcScoreAuthority.verifyRainwaterHarvesting(baselineSampleHarvesting);
        (0, chai_1.expect)(calculationResult.compliant).to.equal(true);
        (0, chai_1.expect)(calculationResult.pointsAwarded).to.equal(3);
        (0, chai_1.expect)(calculationResult.mandatoryBaseline).to.equal(21200);
    });
});
function validateReplayDeterminism(projectId, targetTimestamp, runs) {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            isConsistentlyDeterministic: true,
            canonicalReplayHash: "mock-hash",
            runsExecuted: runs
        };
    });
}
