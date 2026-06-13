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
exports.aiService = exports.AIService = void 0;
const admin_1 = require("@/lib/supabase/admin");
const server_1 = require("@/lib/supabase/server");
const env_1 = require("@/lib/env");
class AIService {
    get client() { return (0, server_1.createClient)(); }
    get admin() { return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.client; }
    validateUploadCandidate(input) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const errors = [];
            const warnings = [];
            const expectedTypes = [];
            const allowedExtensions = new Set(["pdf", "docx", "png", "jpg", "jpeg"]);
            const extension = (_b = (_a = input.fileName.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : "";
            if (!extension || !allowedExtensions.has(extension)) {
                errors.push("Unsupported file extension. Use PDF, DOCX, PNG, or JPG.");
            }
            if (input.fileSize > 100 * 1024 * 1024) {
                warnings.push("Large file detected. Upload may take longer on slower networks.");
            }
            if (!/^[a-zA-Z0-9 _.\-()]+$/.test(input.fileName)) {
                warnings.push("Filename has special characters. Rename for better traceability.");
            }
            let credit = null;
            let creditError = null;
            const queryColumn = input.projectCreditId ? "id" : "credit_id";
            const queryValue = input.projectCreditId || input.creditId;
            const primary = yield this.admin
                .from("project_credits")
                .select("credit_name, documents_required, what_to_submit")
                .eq(queryColumn, queryValue)
                .eq("project_id", input.projectId)
                .maybeSingle();
            credit = primary.data;
            creditError = primary.error;
            if (creditError && String((_c = creditError.message) !== null && _c !== void 0 ? _c : "").toLowerCase().includes("documents_required")) {
                const fallback = yield this.admin
                    .from("project_credits")
                    .select("credit_name, what_to_submit")
                    .eq(queryColumn, queryValue)
                    .eq("project_id", input.projectId)
                    .maybeSingle();
                credit = fallback.data ? Object.assign(Object.assign({}, fallback.data), { documents_required: [] }) : null;
                creditError = fallback.error;
            }
            if (creditError || !credit) {
                errors.push("Credit mapping could not be validated.");
                return { ok: false, errors, warnings, expectedTypes };
            }
            const requiredTypes = (Array.isArray(credit.documents_required) ? credit.documents_required : [])
                .filter((item) => Boolean(item === null || item === void 0 ? void 0 : item.type))
                .map((item) => String(item.type));
            expectedTypes.push(...requiredTypes);
            if (requiredTypes.length > 0 && !requiredTypes.includes(input.docCategory)) {
                errors.push(`Document type '${input.docCategory}' is not mapped to this credit. Allowed types: ${requiredTypes.join(", ")}.`);
            }
            const guidance = String((_d = credit.what_to_submit) !== null && _d !== void 0 ? _d : "").toLowerCase();
            if (guidance && input.docCategory.toLowerCase().includes("narrative") && !guidance.includes("narrative")) {
                warnings.push("This credit guidance may expect evidence beyond narrative. Review 'What to submit' before upload.");
            }
            return {
                ok: errors.length === 0,
                errors,
                warnings,
                expectedTypes,
            };
        });
    }
    getAISuggestions(documentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: document } = yield this.client
                .from("project_document")
                .select("doc_category, project_credit_id")
                .eq("id", documentId)
                .maybeSingle();
            if (!document)
                return [];
            const { data: patterns } = yield this.client
                .from("rejection_patterns")
                .select("rejection_reason, suggested_fix, occurrence_count")
                .eq("credit_id", document.project_credit_id)
                .eq("doc_category", document.doc_category)
                .order("occurrence_count", { ascending: false })
                .limit(3);
            const patternSuggestions = (patterns !== null && patterns !== void 0 ? patterns : []).map((item) => {
                var _a;
                return ({
                    type: "warning",
                    message: item.suggested_fix
                        ? `${item.rejection_reason} Fix: ${item.suggested_fix}`
                        : item.rejection_reason,
                    frequency: (_a = item.occurrence_count) !== null && _a !== void 0 ? _a : 1,
                });
            });
            const baselineSuggestions = [
                {
                    type: "info",
                    message: `Ensure that the ${document.doc_category} includes a clear date and project name.`,
                },
            ];
            return [...baselineSuggestions, ...patternSuggestions];
        });
    }
    getProjectRiskScore(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const { data: docs } = yield this.client
                .from("project_document")
                .select("state, uploaded_at")
                .eq("project_id", projectId)
                .order("uploaded_at", { ascending: false });
            const { data: usage } = yield this.client
                .from("project_usage_summary")
                .select("document_credits_remaining, consultant_credits_remaining")
                .eq("project_id", projectId)
                .maybeSingle();
            const rejections = (_a = docs === null || docs === void 0 ? void 0 : docs.filter((d) => d.state === "REJECTED").length) !== null && _a !== void 0 ? _a : 0;
            const pendingReview = (_b = docs === null || docs === void 0 ? void 0 : docs.filter((d) => {
                var _a;
                const state = String((_a = d.state) !== null && _a !== void 0 ? _a : "").toUpperCase();
                return state === "SUBMITTED" || state === "UNDER_REVIEW" || state === "CLARIFICATION";
            }).length) !== null && _b !== void 0 ? _b : 0;
            const lastUploadMs = (docs === null || docs === void 0 ? void 0 : docs.length)
                ? Math.max(...docs.map((d) => { var _a; return new Date((_a = d.uploaded_at) !== null && _a !== void 0 ? _a : 0).getTime(); }).filter((value) => Number.isFinite(value)))
                : 0;
            const inactiveDays = lastUploadMs ? Math.floor((Date.now() - lastUploadMs) / (1000 * 60 * 60 * 24)) : 30;
            const remainingDocTokens = Number((_c = usage === null || usage === void 0 ? void 0 : usage.document_credits_remaining) !== null && _c !== void 0 ? _c : 0);
            const remainingConsultTokens = Number((_d = usage === null || usage === void 0 ? void 0 : usage.consultant_credits_remaining) !== null && _d !== void 0 ? _d : 0);
            let score = 100;
            score -= rejections * 12;
            score -= pendingReview * 4;
            score -= inactiveDays >= 7 ? Math.min(25, inactiveDays - 6) : 0;
            score -= remainingDocTokens <= 10 ? 15 : 0;
            score -= remainingConsultTokens <= 10 ? 10 : 0;
            score = Math.max(0, score);
            const level = score > 80 ? "low" : score > 55 ? "medium" : "high";
            return {
                score,
                level,
                indicators: [
                    { label: "Rejections", value: rejections, status: rejections > 2 ? "warning" : "ok" },
                    { label: "Pending review", value: pendingReview, status: pendingReview > 5 ? "warning" : "ok" },
                    { label: "Inactive days", value: inactiveDays, status: inactiveDays > 7 ? "warning" : "ok" },
                    { label: "Doc tokens left", value: remainingDocTokens, status: remainingDocTokens <= 10 ? "warning" : "ok" },
                    { label: "Consult tokens left", value: remainingConsultTokens, status: remainingConsultTokens <= 10 ? "warning" : "ok" },
                ],
            };
        });
    }
    queueRecommendation(projectId, action, payload, reasoning) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error } = yield this.admin.from("ai_recommendation_queue").insert({
                project_id: projectId,
                recommended_action: action,
                payload,
                reasoning,
                status: "PENDING_L5_APPROVAL"
            });
            if (error)
                throw error;
        });
    }
}
exports.AIService = AIService;
exports.aiService = new AIService();
