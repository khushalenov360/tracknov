"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.igbcScoreModel = void 0;
exports.scoreIgbcCredits = scoreIgbcCredits;
exports.igbcScoreModel = {
    version: "1.0.0",
    scoringFormulaVersion: "1.0.0",
    mandatoryCreditVersion: "1.0.0",
    thresholdVersion: "1.0.0",
    totalPoints: {
        new: 100,
        existing: 75,
    },
    categoryPoints: {
        EDA: { new: 8, existing: 8 },
        WC: { new: 12, existing: 12 },
        EE: { new: 22, existing: 22 },
        IM: { new: 24, existing: 6 },
        IE: { new: 29, existing: 21 },
        IID: { new: 5, existing: 5 },
    },
    certificationLevels: [
        { level: "Certified", new: [50, 59], existing: [37, 44], recognition: "Best Practices" },
        { level: "Silver", new: [60, 69], existing: [45, 52], recognition: "Outstanding Performance" },
        { level: "Gold", new: [70, 79], existing: [53, 60], recognition: "National Excellence" },
        { level: "Platinum", new: [80, 100], existing: [61, 75], recognition: "Global Leadership" },
    ],
};
function creditCategory(credit) {
    return credit.credit_code.split(" ")[0];
}
function scoreIgbcCredits(credits, variant = "new") {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const earnedByCategory = new Map();
    const totalsByCategory = new Map();
    // Check if any credit has a defined available_points or max_points > 0
    const hasDefinedPoints = credits.some((c) => (c.available_points !== undefined && c.available_points > 0) ||
        (c.max_points !== undefined && Number(c.max_points) > 0));
    for (const category of Object.keys(exports.igbcScoreModel.categoryPoints)) {
        earnedByCategory.set(category, 0);
        if (hasDefinedPoints) {
            // Sum the max_points of all active (non-NA) credits in this category
            const catTotal = credits
                .filter((c) => !c.na && creditCategory(c) === category)
                .reduce((sum, c) => { var _a, _b; return sum + ((_a = c.available_points) !== null && _a !== void 0 ? _a : Number((_b = c.max_points) !== null && _b !== void 0 ? _b : 0)); }, 0);
            totalsByCategory.set(category, catTotal);
        }
        else {
            totalsByCategory.set(category, exports.igbcScoreModel.categoryPoints[category][variant]);
        }
    }
    if (hasDefinedPoints) {
        for (const credit of credits) {
            if (credit.is_mandatory || credit.status !== "complete") {
                continue;
            }
            const category = creditCategory(credit);
            const points = (_a = credit.available_points) !== null && _a !== void 0 ? _a : Number((_b = credit.max_points) !== null && _b !== void 0 ? _b : 0);
            earnedByCategory.set(category, ((_c = earnedByCategory.get(category)) !== null && _c !== void 0 ? _c : 0) + points);
        }
    }
    else {
        // Fallback to proportional split for backward compatibility (e.g. mock tests)
        const categoryCreditCounts = credits.reduce((acc, credit) => {
            var _a;
            if (!credit.is_mandatory) {
                const category = creditCategory(credit);
                acc[category] = ((_a = acc[category]) !== null && _a !== void 0 ? _a : 0) + 1;
            }
            return acc;
        }, {});
        for (const credit of credits) {
            if (credit.is_mandatory || credit.status !== "complete") {
                continue;
            }
            const category = creditCategory(credit);
            const total = (_e = (_d = exports.igbcScoreModel.categoryPoints[category]) === null || _d === void 0 ? void 0 : _d[variant]) !== null && _e !== void 0 ? _e : 0;
            const count = Math.max((_f = categoryCreditCounts[category]) !== null && _f !== void 0 ? _f : 1, 1);
            earnedByCategory.set(category, ((_g = earnedByCategory.get(category)) !== null && _g !== void 0 ? _g : 0) + total / count);
        }
    }
    const earned = Math.round(Array.from(earnedByCategory.values()).reduce((sum, value) => sum + value, 0));
    let totalAvailable = exports.igbcScoreModel.totalPoints[variant];
    if (hasDefinedPoints) {
        // Sum the max_points of all active (non-NA) credits
        totalAvailable = credits
            .filter((c) => !c.na)
            .reduce((sum, c) => { var _a, _b; return sum + ((_a = c.available_points) !== null && _a !== void 0 ? _a : Number((_b = c.max_points) !== null && _b !== void 0 ? _b : 0)); }, 0);
    }
    const level = (_h = [...exports.igbcScoreModel.certificationLevels]
        .reverse()
        .find((item) => earned >= item[variant][0])) !== null && _h !== void 0 ? _h : null;
    return {
        earned,
        totalAvailable,
        percent: totalAvailable ? Math.round((earned / totalAvailable) * 100) : 0,
        level,
        categories: Array.from(totalsByCategory.entries()).map(([category, total]) => {
            var _a;
            return ({
                category,
                total,
                earned: Math.round((_a = earnedByCategory.get(category)) !== null && _a !== void 0 ? _a : 0),
            });
        }),
        versionContext: {
            ruleset_version: exports.igbcScoreModel.version,
            scoring_formula_version: exports.igbcScoreModel.scoringFormulaVersion,
            mandatory_credit_version: exports.igbcScoreModel.mandatoryCreditVersion,
            threshold_version: exports.igbcScoreModel.thresholdVersion,
        }
    };
}
