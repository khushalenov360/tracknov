"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgbcScoreAuthority = void 0;
class IgbcScoreAuthority {
    static verifyChillerEfficiency(data) {
        let mandatoryBaseline = 0;
        if (data.cooling_medium === 'Air-Cooled') {
            mandatoryBaseline = 2.90;
        }
        else if (data.cooling_medium === 'Water-Cooled') {
            if (data.nominal_tr_capacity < 150) {
                mandatoryBaseline = 5.80;
            }
            else if (data.nominal_tr_capacity >= 150 && data.nominal_tr_capacity < 300) {
                mandatoryBaseline = 6.10;
            }
            else {
                mandatoryBaseline = 6.30;
            }
        }
        const compliant = data.full_load_cop >= mandatoryBaseline;
        return {
            compliant,
            pointsAwarded: compliant ? 1 : 0, // Placeholder mapping depending on precise IGBC credit points
            mandatoryBaseline,
            extracted_cop: data.full_load_cop,
            equipment_tag: data.equipment_tag
        };
    }
    static verifyRainwaterHarvesting(data) {
        const roofRunoffCoefficient = 0.95;
        const pavingRunoffCoefficient = 0.75;
        const peakRainfallMeters = 0.040; // 40mm
        const roofDischargeLiters = data.impervious_roof_area_sqm * roofRunoffCoefficient * peakRainfallMeters * 1000;
        const pavingDischargeLiters = data.paved_area_sqm * pavingRunoffCoefficient * peakRainfallMeters * 1000;
        const combinedDischargeLiters = roofDischargeLiters + pavingDischargeLiters;
        const mandatoryTargetCapacity = combinedDischargeLiters * 0.40;
        const compliant = data.designed_pit_capacity_liters >= mandatoryTargetCapacity;
        return {
            compliant,
            pointsAwarded: compliant ? 3 : 0, // Mock max points
            mandatoryBaseline: mandatoryTargetCapacity,
            extracted_capacity: data.designed_pit_capacity_liters,
            combinedDischargeLiters
        };
    }
    static verifyRecycledContentValue(data) {
        const cost = data.invoice_total_cost_inr;
        // Percents are assumed to be raw numbers (e.g., 50 for 50%)
        const postConsumerRaw = data.post_consumer_recycled_pct / 100;
        const preConsumerRaw = data.pre_consumer_recycled_pct / 100;
        const recycledValueContribution = cost * (postConsumerRaw + 0.5 * preConsumerRaw);
        const recycledPercentage = (recycledValueContribution / cost) * 100;
        let pointsAwarded = 0;
        if (recycledPercentage >= 20) {
            pointsAwarded = 2;
        }
        else if (recycledPercentage >= 10) {
            pointsAwarded = 1;
        }
        return {
            compliant: pointsAwarded > 0,
            pointsAwarded,
            recycledValueContribution,
            recycledPercentage,
            material: data.material_description
        };
    }
}
exports.IgbcScoreAuthority = IgbcScoreAuthority;
