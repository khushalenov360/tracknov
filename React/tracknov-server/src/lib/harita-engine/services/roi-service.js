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
exports.getRoiSnapshot = getRoiSnapshot;
const data_1 = require("@/lib/data");
let roiCache = null;
function getRoiSnapshot() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const now = Date.now();
        if (roiCache && roiCache.expiresAt > now) {
            return roiCache.payload;
        }
        const [projects, insights] = yield Promise.all([(0, data_1.getDashboardProjects)(), (0, data_1.getExecutiveInsights)()]);
        const documentsProcessed = projects.reduce((sum, project) => { var _a; return sum + Number((_a = project.uploadedDocs) !== null && _a !== void 0 ? _a : 0); }, 0);
        const rejectionRate = Math.min(100, Math.max(0, insights.projectComparisons.length
            ? Math.round(insights.projectComparisons.reduce((sum, row) => {
                var _a, _b, _c;
                const reviewed = Number((_a = row.pending) !== null && _a !== void 0 ? _a : 0) + Number((_b = row.rejected) !== null && _b !== void 0 ? _b : 0);
                if (!reviewed)
                    return sum;
                return sum + Math.round((Number((_c = row.rejected) !== null && _c !== void 0 ? _c : 0) / reviewed) * 100);
            }, 0) / insights.projectComparisons.length)
            : 0));
        const assumptions = {
            avgReviewMinutes: Number((_a = process.env.ROI_AVG_REVIEW_MINUTES) !== null && _a !== void 0 ? _a : 12),
            reworkReductionPct: Number((_b = process.env.ROI_REWORK_REDUCTION_PCT) !== null && _b !== void 0 ? _b : 35),
            hourlyCostInr: Number((_c = process.env.ROI_HOURLY_COST_INR) !== null && _c !== void 0 ? _c : 1500),
        };
        const timeSavedHours = (documentsProcessed *
            assumptions.avgReviewMinutes *
            (Math.max(0, assumptions.reworkReductionPct) / 100)) /
            60;
        const costSavedInr = Math.round(timeSavedHours * assumptions.hourlyCostInr);
        const rejectionReductionPct = Math.max(0, Math.min(100, Math.round((rejectionRate * assumptions.reworkReductionPct) / 100)));
        const payload = {
            calculatedAt: new Date().toISOString(),
            assumptions,
            totals: {
                projects: projects.length,
                documentsProcessed,
                rejectionReductionPct,
                timeSavedHours: Math.round(timeSavedHours),
                costSavedInr,
            },
        };
        roiCache = {
            payload,
            expiresAt: now + 5 * 60 * 1000,
        };
        return payload;
    });
}
