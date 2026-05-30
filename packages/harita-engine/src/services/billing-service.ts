import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { canAccessBillingAndInvoice, canEditPlanControls } from "@/lib/rbac";
import type { CurrentUser } from "@/lib/types";
import { projectService } from "./project-service";
import { logSystemActivity } from "./activity-service";
import { eventBus } from "@tracknov/core/events/event-bus";

export class BillingService {
  // Test comment
  private get client() { return createClient(); }
  private get admin() { return env.supabaseServiceRoleKey ? createAdminClient() : this.client; }

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

    const { data: membership } = await this.client
      .from("project_users")
      .select("user_id")
      .eq("project_id", params.projectId)
      .eq("role", "client")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const clientUserId = membership?.user_id;
    if (!clientUserId) {
      throw new Error("Client user not found for project.");
    }

    const tokensToBurn = Math.max(1, Math.trunc(params.creditsBurned || 1)) * 50;

    const idempotencyKey = `debit_${params.projectId}_${clientUserId}_${tokensToBurn}_${Date.now()}`;

    const { error: tokenError } = await this.admin.rpc("consume_client_tokens", {
      p_client_user_id: clientUserId,
      p_project_id: params.projectId,
      p_tokens: tokensToBurn,
      p_reason: "Consulting session token burn",
      p_actor_id: user.id,
      p_meta: { 
        source: params.source, 
        notes: params.notes, 
        hours: Math.max(1, Math.trunc(params.creditsBurned || 1)) 
      },
      p_idempotency_key: idempotencyKey,
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

    const idempotencyKey = `credit_${params.projectId}_${params.clientUserId}_${Math.trunc(params.tokens)}_${Date.now()}`;

    const { error } = await this.admin.rpc("credit_client_tokens", {
      p_client_user_id: params.clientUserId,
      p_project_id: params.projectId,
      p_tokens: Math.trunc(params.tokens),
      p_reason: params.reason || "Super User top-up",
      p_actor_id: user.id,
      p_meta: { loaded_by_role: role },
      p_idempotency_key: idempotencyKey,
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
    const { data, error } = await this.admin
      .from("client_token_wallets")
      .select("token_balance")
      .eq("client_user_id", clientUserId)
      .maybeSingle();

    if (error) throw error;
    return data?.token_balance ?? 0;
  }

  /**
   * Gets the transaction history for a client.
   */
  async getTransactionHistory(user: CurrentUser, clientUserId: string, limit = 50) {
    const { data, error } = await this.admin
      .from("client_token_transactions")
      .select("*")
      .eq("client_user_id", clientUserId)
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

    const { data: transactions } = await this.admin
      .from("token_transactions")
      .select("amount")
      .eq("client_id", (await this.admin.from("project_users").select("client_id").eq("user_id", clientUserId).limit(1).maybeSingle()).data?.client_id);

    const calculatedBalance = transactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) ?? 0;

    const { data: wallet } = await this.admin
      .from("client_token_wallets")
      .select("token_balance")
      .eq("client_user_id", clientUserId)
      .maybeSingle();

    const currentBalance = Number(wallet?.token_balance ?? 0);
    const mismatch = calculatedBalance !== currentBalance;

    if (mismatch) {
      await this.admin
        .from("client_token_wallets")
        .update({ token_balance: calculatedBalance, updated_at: new Date().toISOString() })
        .eq("client_user_id", clientUserId);

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
