import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { canAccessBillingAndInvoice, canEditPlanControls } from "@/lib/rbac";
import type { CurrentUser } from "@/lib/types";
import { projectService } from "./project-service";
import { logSystemActivity } from "./activity-service";
import { eventBus } from "@/lib/core/events/event-bus";

export class BillingService {
  // Test comment
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

  private async resolveProjectClientAccountId(projectId: string) {
    const { data: project, error } = await this.admin
      .from("projects")
      .select("id, client_account_id")
      .eq("id", projectId)
      .maybeSingle();

    if (error) throw error;
    if (!project?.client_account_id) {
      throw new Error("Client account is not linked for this project yet.");
    }

    return String(project.client_account_id);
  }

  private async resolveClientAccountIdFromUser(clientUserId: string) {
    const { data: account, error } = await this.admin
      .from("client_accounts")
      .select("id")
      .eq("primary_client_user_id", clientUserId)
      .maybeSingle();

    if (error) throw error;
    if (!account?.id) {
      throw new Error("Client account could not be resolved for the selected client user.");
    }

    return String(account.id);
  }

  /**
   * Updates project billing settings and quotas.
   */
  async updateBillingSettings(user: CurrentUser, params: {
    projectId: string;
    planCode: string;
    documentCreditLimit: number;
    consultantCreditLimit: number;
    topupDocumentCredits: number;
    topupConsultantCredits: number;
  }) {
    const role = await projectService.getActorProjectRole(params.projectId, user);
    if (!canEditPlanControls(role)) {
      throw new Error("Unauthorized: Insufficient permissions to update billing settings.");
    }

    const { error } = await this.admin.from("project_billing_settings").upsert(
      {
        project_id: params.projectId,
        plan_code: params.planCode,
        document_credit_limit: params.documentCreditLimit,
        consultant_credit_limit: params.consultantCreditLimit,
        topup_document_credits: params.topupDocumentCredits,
        topup_consultant_credits: params.topupConsultantCredits,
        updated_by: user.id,
      },
      { onConflict: "project_id" },
    );

    if (error) throw error;
  }

  /**
   * Consumes tokens for a consulting session.
   */
  async consumeConsultantTokens(user: CurrentUser, params: {
    projectId: string;
    creditsBurned: number;
    source: string;
    notes: string;
  }) {
    const role = await projectService.getActorProjectRole(params.projectId, user);
    if (!canAccessBillingAndInvoice(role)) {
      throw new Error("Unauthorized: Insufficient permissions for billing actions.");
    }

    const clientAccountId = await this.resolveProjectClientAccountId(params.projectId);

    const tokensToBurn = Math.max(1, Math.trunc(params.creditsBurned || 1)) * 50;

    const { error: tokenError } = await this.admin.rpc("debit_client_account_tokens", {
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

    if (tokenError) throw tokenError;

    // Log the session record
    const { error: sessionError } = await this.admin.from("consultant_sessions").insert({
      project_id: params.projectId,
      source: params.source,
      notes: params.notes,
      credits_burned: params.creditsBurned,
      created_by: user.id,
    });

    if (sessionError) throw sessionError;

    // Emit Event
    await eventBus.emit({
      type: "TOKEN_DEDUCTED",
      payload: {
        projectId: params.projectId,
        amount: tokensToBurn,
        userId: user.id,
        reason: `Consulting session: ${params.notes}`,
      }
    });
  }

  /**
   * Creates a top-up invoice record.
   */
  async createTopupInvoice(user: CurrentUser, params: {
    projectId: string;
    documentCredits: number;
    consultantCredits: number;
    amountInr: number;
    notes?: string;
  }) {
    const role = await projectService.getActorProjectRole(params.projectId, user);
    if (!canAccessBillingAndInvoice(role)) {
      throw new Error("Unauthorized: Insufficient permissions for billing and invoice.");
    }

    const { error } = await this.admin.from("billing_invoices").insert({
      project_id: params.projectId,
      document_credits: params.documentCredits,
      consultant_credits: params.consultantCredits,
      amount_inr: params.amountInr,
      status: "pending",
      created_by: user.id,
      notes: params.notes,
    });

    if (error) throw error;

    await logSystemActivity(this.admin, {
      projectId: params.projectId,
      entityType: "billing",
      entityId: params.projectId,
      action: "topup_invoiced",
      actorId: user.id,
      actorRole: user.role,
      summary: "Created top-up invoice.",
      details: { document_credits: params.documentCredits, consultant_credits: params.consultantCredits, amount_inr: params.amountInr, notes: params.notes },
    });
  }

  /**
   * Loads tokens into a client wallet.
   */
  async loadClientTokens(user: CurrentUser, params: {
    projectId: string;
    clientUserId: string;
    tokens: number;
    reason: string;
  }) {
    const role = await projectService.getActorProjectRole(params.projectId, user);
    if (role !== "super_user") {
      throw new Error("Only Super User can load client tokens.");
    }

    const clientAccountId = await this.resolveClientAccountIdFromUser(params.clientUserId);

    const { error } = await this.admin.rpc("credit_client_account_tokens", {
      p_client_account_id: clientAccountId,
      p_project_id: params.projectId,
      p_tokens: Math.trunc(params.tokens),
      p_reason: params.reason || "Super User top-up",
      p_actor_id: user.id,
      p_subject_user_id: params.clientUserId,
      p_feature_code: "manual_credit",
      p_meta: { loaded_by_role: role },
    });

    if (error) throw error;

    await logSystemActivity(this.admin, {
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
    await eventBus.emit({
      type: "TOKEN_CREDITED",
      payload: {
        projectId: params.projectId,
        amount: Math.trunc(params.tokens),
        userId: user.id,
        reason: params.reason,
      }
    });
  }

  /**
   * Gets the wallet balance for a client.
   */
  async getWalletBalance(user: CurrentUser, clientUserId: string) {
    const clientAccountId = await this.resolveClientAccountIdFromUser(clientUserId);
    const { data, error } = await this.admin
      .from("client_accounts")
      .select("token_balance")
      .eq("id", clientAccountId)
      .maybeSingle();

    if (error) throw error;
    return data?.token_balance ?? 0;
  }

  /**
   * Gets the transaction history for a client.
   */
  async getTransactionHistory(user: CurrentUser, clientUserId: string, limit = 50) {
    const clientAccountId = await this.resolveClientAccountIdFromUser(clientUserId);
    const { data, error } = await this.admin
      .from("token_transactions")
      .select("*")
      .eq("client_account_id", clientAccountId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Reconciles the client wallet balance against transaction history.
   * Ensures 100% accuracy (Token Engine 9).
   */
  async reconcileClientWallet(user: CurrentUser, clientUserId: string) {
    const role = await projectService.getActorProjectRole("", user);
    if (!(role === "super_user" || role === "super_admin")) {
      throw new Error("Unauthorized: Only Super Admin can run reconciliation.");
    }

    const clientAccountId = await this.resolveClientAccountIdFromUser(clientUserId);
    const { data: transactions } = await this.admin
      .from("token_transactions")
      .select("transaction_kind, tokens")
      .eq("client_account_id", clientAccountId);

    const calculatedBalance = transactions?.reduce((sum, tx: any) => {
      const direction = tx.transaction_kind === "debit" ? -1 : 1;
      return sum + direction * Number(tx.tokens ?? 0);
    }, 0) ?? 0;

    const { data: wallet } = await this.admin
      .from("client_accounts")
      .select("token_balance")
      .eq("id", clientAccountId)
      .maybeSingle();

    const currentBalance = Number(wallet?.token_balance ?? 0);
    const mismatch = calculatedBalance !== currentBalance;

    if (mismatch) {
      await this.admin
        .from("client_accounts")
        .update({ token_balance: calculatedBalance, updated_at: new Date().toISOString() })
        .eq("id", clientAccountId);

      await logSystemActivity(this.admin, {
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
  }
}

export const billingService = new BillingService();
