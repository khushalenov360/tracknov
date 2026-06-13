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
const certification_gap_engine_1 = require("../intelligence/certification/certification-gap-engine");
const vitest_1 = require("vitest");
(0, vitest_1.describe)('Certification Gap Narrative Engine', () => {
    (0, vitest_1.it)('should generate a correct gap narrative', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockContext = {
            credits: [
                { credit_code: "EDA C1", status: "BLOCKED", completion_pct: 30, points: 2 },
                { credit_code: "WE C1", status: "BLOCKED", completion_pct: 10, points: 4 },
                { credit_code: "MR C2", status: "APPROVED", completion_pct: 100, points: 60 }
            ]
        };
        const gap = yield certification_gap_engine_1.CertificationGapEngine.calculateCertificationGap("p1", mockContext);
        (0, vitest_1.expect)(gap.narrative).toContain("Gold is already secured.");
        (0, vitest_1.expect)(gap.narrative).toContain("6 points remain at risk.");
        (0, vitest_1.expect)(gap.narrative).toContain("Platinum becomes unattainable.");
        (0, vitest_1.expect)(gap.narrative).toContain("- EDA C1");
    }));
});
