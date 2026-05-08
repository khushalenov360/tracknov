# Tracknov V2 Handover Guide

## 1. Environment Setup
- **Supabase**: Ensure all migrations (0001-0033) are applied.
- **Extensions**: `pgvector` must be enabled in the Supabase dashboard.
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (Required for AI and Billing services)

## 2. Maintenance Tasks
- **Schema Updates**: Always use the `supabase/migrations` folder and apply via CLI or the SQL bridge (`exec_migrations` RPC).
- **AI RAG Priming**: Run `AIService.ingestProjectGuidance()` to re-index IGBC guidelines if the credits table is bulk-updated.
- **Wallet Rebalancing**: Run `BillingService.reconcileClientWallet()` monthly to ensure ledger-balance parity.

## 3. Support Matrix
- **Workflow Issues**: Check `document_states` and `activity_logs` for transition failures.
- **Token Issues**: Check `client_token_transactions` for idempotency failures.
- **AI Issues**: Verify the `vector` extension and check the `embeddings` table volume.

---
**Enov360 Development Team**
