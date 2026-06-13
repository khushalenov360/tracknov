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
exports.submittalService = exports.SubmittalService = void 0;
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const governanceMutationInterceptor_1 = require("@/lib/harita-engine/governance/governanceMutationInterceptor");
class SubmittalService {
    constructor() {
        this.client = (0, server_1.createClient)();
        this.admin = (0, admin_1.createAdminClient)();
    }
    /**
     * Validates if a submittal can transition to a target state based on its documents.
     * This is the 'Gate' logic.
     */
    validateSubmittalGate(submittalId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: documents } = yield this.admin
                .from("project_document")
                .select("state, workflow_state, is_latest")
                .eq("submittal_id", submittalId)
                .eq("is_latest", true);
            if (!documents || documents.length === 0) {
                return { ok: false, message: "No documents found for this submittal." };
            }
            const allApproved = documents.every(d => (d.workflow_state || d.state) === "APPROVED");
            if (!allApproved) {
                const pendingCount = documents.filter(d => (d.workflow_state || d.state) !== "APPROVED").length;
                return { ok: false, message: `${pendingCount} documents are still pending approval.` };
            }
            return { ok: true };
        });
    }
    /**
     * Recalculates the submittal state based on its documents.
     */
    recalculateSubmittalState(submittalId, writer) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const db = writer || this.admin;
            // SECTION 26: Intercept mutation if in replay mode
            yield (0, governanceMutationInterceptor_1.interceptMutation)({
                mutationType: "RECALCULATE_SUBMITTAL_STATE",
                sourceLayer: "SubmittalService",
                reason: "Automated derived state recalculation",
                payload: { submittalId }
            });
            yield db.rpc("recalculate_submittal_state", { p_submittal_id: submittalId });
            // After updating submittal, update the parent stage
            const { data: submittal } = yield db
                .from("submittals")
                .select("credit_stage_id, project_credit_id")
                .eq("id", submittalId)
                .single();
            if (submittal === null || submittal === void 0 ? void 0 : submittal.credit_stage_id) {
                yield this.recalculateStageState(submittal.credit_stage_id, db, (_a = submittal.project_credit_id) !== null && _a !== void 0 ? _a : null);
            }
        });
    }
    recalculateStageState(stageId, writer, projectCreditId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const db = writer || this.admin;
            // SECTION 26: Intercept mutation if in replay mode
            yield (0, governanceMutationInterceptor_1.interceptMutation)({
                mutationType: "RECALCULATE_STAGE_STATE",
                sourceLayer: "SubmittalService",
                reason: "Automated derived state recalculation",
                payload: { stageId, projectCreditId }
            });
            let effectiveProjectCreditId = projectCreditId !== null && projectCreditId !== void 0 ? projectCreditId : null;
            if (!effectiveProjectCreditId) {
                const { data: stage } = yield db
                    .from("credit_stages")
                    .select("project_credit_id")
                    .eq("id", stageId)
                    .maybeSingle();
                effectiveProjectCreditId = (_a = stage === null || stage === void 0 ? void 0 : stage.project_credit_id) !== null && _a !== void 0 ? _a : null;
            }
            if (effectiveProjectCreditId) {
                yield db.rpc("recalculate_credit_state", { p_project_credit_id: effectiveProjectCreditId });
            }
        });
    }
}
exports.SubmittalService = SubmittalService;
exports.submittalService = new SubmittalService();
