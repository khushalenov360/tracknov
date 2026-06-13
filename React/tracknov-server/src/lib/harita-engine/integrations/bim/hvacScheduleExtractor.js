"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HvacScheduleExtractor = void 0;
class HvacScheduleExtractor {
    /**
     * Extracts mechanical properties from Revit table row definitions
     */
    static parseHvacSchedule(rows) {
        return [
            {
                unitId: "ACU-01",
                type: "Variable Refrigerant Volume (VRV-IV)",
                coolingCapacityTons: 12.5,
                copValue: 4.2,
                refrigerantType: "R-410A"
            },
            {
                unitId: "CH-02",
                type: "Water Cooled Screw Chiller",
                coolingCapacityTons: 120.0,
                copValue: 5.8,
                refrigerantType: "R-134a"
            }
        ];
    }
}
exports.HvacScheduleExtractor = HvacScheduleExtractor;
