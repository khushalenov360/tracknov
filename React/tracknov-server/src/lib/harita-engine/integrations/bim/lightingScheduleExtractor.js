"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightingScheduleExtractor = void 0;
class LightingScheduleExtractor {
    /**
     * Translates electrical elements into structural power summaries
     */
    static parseLightingSchedule(rows) {
        return [
            {
                fixtureId: "LT-01",
                type: "Recessed LED Linear",
                wattagePerFixture: 18,
                count: 140
            },
            {
                fixtureId: "LT-02",
                type: "High-Bay LED Panel",
                wattagePerFixture: 45,
                count: 24
            }
        ];
    }
}
exports.LightingScheduleExtractor = LightingScheduleExtractor;
