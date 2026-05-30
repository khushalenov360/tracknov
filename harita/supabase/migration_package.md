# Tracknov Migration Package Catalog
**Version**: V2 Execution Baseline
**Total Migrations**: 101

This catalog organizes the flat directory of Supabase migrations into logical Epochs, serving as the deployment runbook for the Tracknov V2 Baseline.

## Epoch 1: Foundation (0001 - 0014)
*Establishes the core data primitives and project hierarchy.*

- `0001_initial.sql` - Core schema (Projects, Users, Profiles)
- `0004_super_admin_project_admin.sql` - Base RBAC primitives
- `0008_project_rbac.sql` - Project-level Role-Based Access Control
- `0014_onboarding_checklists.sql` - Project initialization data

## Epoch 2: Intelligence & Orchestration (0015 - 0036)
*Introduces document workflows, EnovAIT capabilities, and activity telemetry.*

- `0015_client_tokens.sql` - External integration security
- `0019_workflow_db_enforcement.sql` - DB-level workflow triggers
- `0024_ai_readiness.sql` - AI vector context fields
- `0036_document_intelligence.sql` - Semantic document extraction

## Epoch 3: IGBC Domain Seed (0037 - 0045)
*Seeds the initial Green Building Certification frameworks.*

- `0037_igbc_master_library.sql` - Reference architecture for IGBC
- `0039_igbc_initial_seed.sql` - Instantiation of rating systems
- `0041_igbc_impact_rules.sql` - Environmental impact logic

## Epoch 4: Baseline V2 Hardening & Governance (0046 - 0105)
*Implements Rule #67 execution strictness, isolating AI, locking down states, and resolving recursion vulnerabilities.*

- `0051_auditor_enforcement_baseline.sql` - L5 (Auditor) enforcement
- `0052_ai_auditor_governance.sql` - Restricts AI from making audit claims
- `0056_runtime_semantics_orchestration_hardening.sql` - Advanced RLS locking
- `0064_rls_governance_enforcement.sql` - Row Level Security Governance
- `0076_certification_lock_runtime_enforcement.sql` - Prevents edits post-certification
- `0079_runtime_instrumentation_layer.sql` - Auditing and telemetry
- `0100_enovait_schema.sql` - Formalizes AI data structures
- `20260525092437_enovait_separation_schema.sql` - V2 Tenant isolation boundary

> [!CAUTION]
> **Deployment Rule**: Never squash migrations across Epochs. Epoch 4 migrations depend on strict constraints established in Epoch 3. Always run sequential deployment `supabase db push` against the target branch.
