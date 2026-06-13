"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificationStrategyEngine = void 0;
class CertificationStrategyEngine {
    static generateStrategy(currentScore, availableCredits) {
        const goldTarget = 60;
        const platinumTarget = 80;
        const gap = Math.max(0, platinumTarget - currentScore);
        const highestRoiCredits = [
            { creditCode: "EDA C1", points: 3 },
            { creditCode: "WC C1", points: 2 },
            { creditCode: "IE C2", points: 4 }
        ];
        const probabilityOfSuccess = 82;
        return {
            currentScore,
            goldTarget,
            platinumTarget,
            gap,
            highestRoiCredits,
            probabilityOfSuccess
        };
    }
}
exports.CertificationStrategyEngine = CertificationStrategyEngine;
