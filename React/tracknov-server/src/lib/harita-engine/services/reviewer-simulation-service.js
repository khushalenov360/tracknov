"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReviewerSimulation = runReviewerSimulation;
function normalizeState(value) {
    return String(value !== null && value !== void 0 ? value : "").trim().toUpperCase();
}
function isApprovedState(state) {
    return state === "APPROVED";
}
function runReviewerSimulation(workspace) {
    var _a, _b, _c, _d, _e;
    const findings = [];
    let completenessPenalty = 0;
    let consistencyPenalty = 0;
    let compliancePenalty = 0;
    for (const credit of (_a = workspace.credits) !== null && _a !== void 0 ? _a : []) {
        const requirements = ((_b = credit.documents_required) !== null && _b !== void 0 ? _b : []).filter((item) => item.required);
        const latestDocs = ((_c = credit.documents) !== null && _c !== void 0 ? _c : []).filter((doc) => doc.is_latest !== false);
        // Completeness check: required slots must have at least one latest document.
        const missingRequired = requirements.filter((required) => !latestDocs.some((doc) => doc.doc_category === required.type));
        if (missingRequired.length > 0) {
            completenessPenalty += missingRequired.length * 8;
            findings.push({
                creditId: credit.id,
                creditCode: credit.credit_code,
                creditName: credit.credit_name,
                severity: "fail",
                message: `Missing required evidence: ${missingRequired.map((item) => item.label || item.type).join(", ")}.`,
            });
        }
        // Consistency check: latest docs should not have duplicate categories.
        const counts = new Map();
        for (const doc of latestDocs) {
            const key = String((_d = doc.doc_category) !== null && _d !== void 0 ? _d : "").trim();
            if (!key)
                continue;
            counts.set(key, ((_e = counts.get(key)) !== null && _e !== void 0 ? _e : 0) + 1);
        }
        const duplicated = Array.from(counts.entries()).filter(([, count]) => count > 1);
        if (duplicated.length > 0) {
            consistencyPenalty += duplicated.length * 4;
            findings.push({
                creditId: credit.id,
                creditCode: credit.credit_code,
                creditName: credit.credit_name,
                severity: "warning",
                message: `Multiple latest documents detected for: ${duplicated.map(([key]) => key).join(", ")}.`,
            });
        }
        // Compliance check: mandatory credits should have approved latest docs in required slots.
        if (credit.is_mandatory) {
            const nonApprovedRequired = requirements.filter((required) => {
                const candidates = latestDocs.filter((doc) => doc.doc_category === required.type);
                if (candidates.length === 0)
                    return true;
                return !candidates.some((doc) => { var _a; return isApprovedState(normalizeState((_a = doc.state) !== null && _a !== void 0 ? _a : doc.status)); });
            });
            if (nonApprovedRequired.length > 0) {
                compliancePenalty += nonApprovedRequired.length * 10;
                findings.push({
                    creditId: credit.id,
                    creditCode: credit.credit_code,
                    creditName: credit.credit_name,
                    severity: "fail",
                    message: `Mandatory credit has pending/non-approved required evidence: ${nonApprovedRequired
                        .map((item) => item.label || item.type)
                        .join(", ")}.`,
                });
            }
        }
    }
    const failed = findings.filter((item) => item.severity === "fail").length;
    const warnings = findings.filter((item) => item.severity === "warning").length;
    const status = failed > 0 ? "fail" : warnings > 0 ? "warning" : "pass";
    const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
    const completenessScore = clamp(100 - completenessPenalty);
    const consistencyScore = clamp(100 - consistencyPenalty);
    const complianceScore = clamp(100 - compliancePenalty);
    return {
        status,
        summary: {
            creditsChecked: workspace.credits.length,
            findings: findings.length,
            failed,
            warnings,
            complianceScore,
            completenessScore,
            consistencyScore,
        },
        findings,
    };
}
