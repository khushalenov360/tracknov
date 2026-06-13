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
exports.getCreditAssignmentGraph = getCreditAssignmentGraph;
function getCreditAssignmentGraph(projectIds, credits, reader) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        const result = new Map();
        // Fetch all active assignments for these projects
        const { data: assignmentsData, error } = yield reader
            .from("assignments")
            .select("project_credit_id, user_id, role, document_type")
            .in("project_id", projectIds)
            .eq("is_active", true);
        if (error) {
            console.error("Error fetching credit assignments:", error);
        }
        const assignments = (assignmentsData !== null && assignmentsData !== void 0 ? assignmentsData : []);
        const userIds = [...new Set(assignments.map(a => a.user_id).filter(Boolean))];
        const profileMap = new Map();
        if (userIds.length > 0) {
            const { data: profilesData } = yield reader
                .from("profiles")
                .select("user_id, full_name, email")
                .in("user_id", userIds);
            for (const p of profilesData !== null && profilesData !== void 0 ? profilesData : []) {
                profileMap.set(p.user_id, { full_name: (_a = p.full_name) !== null && _a !== void 0 ? _a : "Unknown", email: (_b = p.email) !== null && _b !== void 0 ? _b : "" });
            }
        }
        // Build a lookup map of assignments by credit_id and document_type
        const assignmentLookup = new Map();
        for (const a of assignments) {
            if (a.project_credit_id && a.document_type) {
                assignmentLookup.set(`${a.project_credit_id}::${a.document_type}`, a);
            }
        }
        for (const credit of credits) {
            const requirements = [];
            // Fallback if documents_required is missing or empty
            const docsRequired = Array.isArray(credit.documents_required) ? credit.documents_required : [];
            for (const req of docsRequired) {
                const type = req.type || req.label || "Document";
                const key = `${credit.id}::${type}`;
                const assignment = assignmentLookup.get(key);
                let contributorName = null;
                if (assignment === null || assignment === void 0 ? void 0 : assignment.user_id) {
                    const profile = profileMap.get(assignment.user_id);
                    contributorName = (_c = profile === null || profile === void 0 ? void 0 : profile.full_name) !== null && _c !== void 0 ? _c : null;
                }
                requirements.push({
                    requirementId: type, // Using type as ID since there's no inherent ID
                    requirementType: type,
                    contributorId: (_d = assignment === null || assignment === void 0 ? void 0 : assignment.user_id) !== null && _d !== void 0 ? _d : null,
                    contributorName: contributorName,
                    contributorRole: (_e = assignment === null || assignment === void 0 ? void 0 : assignment.role) !== null && _e !== void 0 ? _e : null,
                });
            }
            result.set(credit.id, {
                creditId: credit.id,
                creditCode: credit.credit_code,
                creditName: (_f = credit.credit_name) !== null && _f !== void 0 ? _f : "",
                status: credit.state,
                completionPercentage: (_g = credit.completion_pct) !== null && _g !== void 0 ? _g : 0,
                requirements,
            });
        }
        return result;
    });
}
