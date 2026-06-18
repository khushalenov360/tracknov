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
exports.billingService = exports.BillingService = void 0;
const server_1 = require("@/lib/supabase/server");
const admin_1 = require("@/lib/supabase/admin");
const env_1 = require("@/lib/env");
const rbac_1 = require("@/lib/rbac");
const project_service_1 = require("./project-service");
const activity_service_1 = require("./activity-service");
const event_bus_1 = require("@/lib/core/events/event-bus");
class BillingService {
    // Test comment
    get client() { return (0, server_1.createClient)(); }
    get admin() { return env_1.env.supabaseServiceRoleKey ? (0, admin_1.createAdminClient)() : this.client; }
    resolveProjectClientAccountId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: project, error } = yield this.admin
                .from("projects")
                .select("id, client_account_id")
                .eq("id", projectId)
                .maybeSingle();
            if (error)
                throw error;
            if (!(project === null || project === void 0 ? void 0 : project.client_account_id)) {
                throw new Error("Client account is not linked for this project yet.");
            }
            return String(project.client_account_id);
        });
    }
    resolveClientAccountIdFromUser(clientUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: account, error } = yield this.admin
                .from("client_accounts")
                .select("id")
                .eq("primary_client_user_id", clientUserId)
                .maybeSingle();
            if (error)
                throw error;
            if (!(account === null || account === void 0 ? void 0 : account.id)) {
                throw new Error("Client account could not be resolved for the selected client user.");
            }
            return String(account.id);
        });
    }
    /**
     * Updates project billing settings and quotas.
     */
    updateBillingSettings(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const role = yield project_service_1.projectService.getActorProjectRole(params.projectId, user);
            if (!(0, rbac_1.canEditPlanControls)(role)) {
                throw new Error("Unauthorized: Insufficient permissions to update billing settings.");
            }
            const { error } = yield this.admin.from("project_billing_settings").upsert({
                project_id: params.projectId,
                plan_code: params.planCode,
                document_credit_limit: params.documentCreditLimit,
                consultant_credit_limit: params.consultantCreditLimit,
                topup_document_credits: params.topupDocumentCredits,
                topup_consultant_credits: params.topupConsultantCredits,
                updated_by: user.id,
            }, { onConflict: "project_id" });
            if (error)
                throw error;
        });
    }
    /**
     * Consumes tokens for a consulting session.
     */
    consumeConsultantTokens(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const role = yield project_service_1.projectService.getActorProjectRole(params.projectId, user);
            if (!(0, rbac_1.canAccessBillingAndInvoice)(role)) {
                throw new Error("Unauthorized: Insufficient permissions for billing actions.");
            }
            const clientAccountId = yield this.resolveProjectClientAccountId(params.projectId);
            const tokensToBurn = Math.max(1, Math.trunc(params.creditsBurned || 1)) * 50;
            const { error: tokenError } = yield this.admin.rpc("debit_client_account_tokens", {
                p_client_account_id: clientAccountId,
                p_project_id: params.projectId,
                p_tokens: tokensToBurn,
                p_reason: "Consulting session token burn",
                p_actor_id: user.id,
                p_subject_user_id: user.id,
                p_feature_code: "expert_consultation",
                p_meta: {
                    source: params.source,
                    notes: params.notes,
                    hours: Math.max(1, Math.trunc(params.creditsBurned || 1))
                },
            });
            if (tokenError)
                throw tokenError;
            // Log the session record
            const { error: sessionError } = yield this.admin.from("consultant_sessions").insert({
                project_id: params.projectId,
                source: params.source,
                notes: params.notes,
                credits_burned: params.creditsBurned,
                created_by: user.id,
            });
            if (sessionError)
                throw sessionError;
            // Emit Event
            yield event_bus_1.eventBus.emit({
                type: "TOKEN_DEDUCTED",
                payload: {
                    projectId: params.projectId,
                    amount: tokensToBurn,
                    userId: user.id,
                    reason: `Consulting session: ${params.notes}`,
                }
            });
        });
    }
    /**
     * Creates a top-up invoice record.
     */
    createTopupInvoice(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const role = yield project_service_1.projectService.getActorProjectRole(params.projectId, user);
            if (!(0, rbac_1.canAccessBillingAndInvoice)(role)) {
                throw new Error("Unauthorized: Insufficient permissions for billing and invoice.");
            }
            const { error } = yield this.admin.from("billing_invoices").insert({
                project_id: params.projectId,
                document_credits: params.documentCredits,
                consultant_credits: params.consultantCredits,
                amount_inr: params.amountInr,
                status: "pending",
                created_by: user.id,
                notes: params.notes,
            });
            if (error)
                throw error;
            yield (0, activity_service_1.logSystemActivity)(this.admin, {
                projectId: params.projectId,
                entityType: "billing",
                entityId: params.projectId,
                action: "topup_invoiced",
                actorId: user.id,
                actorRole: user.role,
                summary: "Created top-up invoice.",
                details: { document_credits: params.documentCredits, consultant_credits: params.consultantCredits, amount_inr: params.amountInr, notes: params.notes },
            });
        });
    }
    /**
     * Loads tokens into a client wallet.
     */
    loadClientTokens(user, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const role = yield project_service_1.projectService.getActorProjectRole(params.projectId, user);
            if (role !== "super_user") {
                throw new Error("Only Super User can load client tokens.");
            }
            const clientAccountId = yield this.resolveClientAccountIdFromUser(params.clientUserId);
            const { error } = yield this.admin.rpc("credit_client_account_tokens", {
                p_client_account_id: clientAccountId,
                p_project_id: params.projectId,
                p_tokens: Math.trunc(params.tokens),
                p_reason: params.reason || "Super User top-up",
                p_actor_id: user.id,
                p_subject_user_id: params.clientUserId,
                p_feature_code: "manual_credit",
                p_meta: { loaded_by_role: role },
            });
            if (error)
                throw error;
            yield (0, activity_service_1.logSystemActivity)(this.admin, {
                projectId: params.projectId,
                entityType: "billing",
                entityId: params.clientUserId,
                action: "client_tokens_loaded",
                actorId: user.id,
                actorRole: role,
                summary: `Loaded ${Math.trunc(params.tokens)} tokens to client wallet.`,
                details: { client_user_id: params.clientUserId, reason: params.reason },
            });
            // Emit Event
            yield event_bus_1.eventBus.emit({
                type: "TOKEN_CREDITED",
                payload: {
                    projectId: params.projectId,
                    amount: Math.trunc(params.tokens),
                    userId: user.id,
                    reason: params.reason,
                }
            });
        });
    }
    /**
     * Gets the wallet balance for a client.
     */
    getWalletBalance(user, clientUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const clientAccountId = yield this.resolveClientAccountIdFromUser(clientUserId);
            const { data, error } = yield this.admin
                .from("client_accounts")
                .select("token_balance")
                .eq("id", clientAccountId)
                .maybeSingle();
            if (error)
                throw error;
            return (_a = data === null || data === void 0 ? void 0 : data.token_balance) !== null && _a !== void 0 ? _a : 0;
        });
    }
    /**
     * Gets the transaction history for a client.
     */
    getTransactionHistory(user_1, clientUserId_1) {
        return __awaiter(this, arguments, void 0, function* (user, clientUserId, limit = 50) {
            const clientAccountId = yield this.resolveClientAccountIdFromUser(clientUserId);
            const { data, error } = yield this.admin
                .from("token_transactions")
                .select("*")
                .eq("client_account_id", clientAccountId)
                .order("created_at", { ascending: false })
                .limit(limit);
            if (error)
                throw error;
            return data || [];
        });
    }
    /**
     * Reconciles the client wallet balance against transaction history.
     * Ensures 100% accuracy (Token Engine 9).
     */
    reconcileClientWallet(user, clientUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const role = yield project_service_1.projectService.getActorProjectRole("", user);
            if (!(role === "super_user" || role === "super_admin")) {
                throw new Error("Unauthorized: Only Super Admin can run reconciliation.");
            }
            const clientAccountId = yield this.resolveClientAccountIdFromUser(clientUserId);
            const { data: transactions } = yield this.admin
                .from("token_transactions")
                .select("transaction_kind, tokens")
                .eq("client_account_id", clientAccountId);
            const calculatedBalance = (_a = transactions === null || transactions === void 0 ? void 0 : transactions.reduce((sum, tx) => {
                var _a;
                const direction = tx.transaction_kind === "debit" ? -1 : 1;
                return sum + direction * Number((_a = tx.tokens) !== null && _a !== void 0 ? _a : 0);
            }, 0)) !== null && _a !== void 0 ? _a : 0;
            const { data: wallet } = yield this.admin
                .from("client_accounts")
                .select("token_balance")
                .eq("id", clientAccountId)
                .maybeSingle();
            const currentBalance = Number((_b = wallet === null || wallet === void 0 ? void 0 : wallet.token_balance) !== null && _b !== void 0 ? _b : 0);
            const mismatch = calculatedBalance !== currentBalance;
            if (mismatch) {
                yield this.admin
                    .from("client_accounts")
                    .update({ token_balance: calculatedBalance, updated_at: new Date().toISOString() })
                    .eq("id", clientAccountId);
                yield (0, activity_service_1.logSystemActivity)(this.admin, {
                    projectId: "",
                    entityType: "billing",
                    entityId: clientUserId,
                    action: "wallet_reconciled",
                    actorId: user.id,
                    actorRole: role,
                    summary: `Reconciled wallet balance from ${currentBalance} to ${calculatedBalance}.`,
                    details: { previous: currentBalance, reconciled: calculatedBalance },
                });
            }
            return { reconciled: mismatch, previous: currentBalance, current: calculatedBalance };
        });
    }
}
exports.BillingService = BillingService;
exports.billingService = new BillingService();
