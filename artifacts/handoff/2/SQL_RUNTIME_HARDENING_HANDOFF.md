# TRACKNOV — SQL_RUNTIME_HARDENING_HANDOFF

Source: User-provided auditor handoff (2026-05-06)

## Scope

Mandatory DB/runtime hardening to move Tracknov from partial enforcement to enterprise-grade deterministic compliance infrastructure.

This handoff governs:

- runtime enforcement
- DB invariants
- reconciliation integrity
- immutable lineage
- orchestration enforcement
- certification defensibility

## Strict implementation order

1. Runtime schema synchronization
2. DB invariant enforcement
3. Immutable lineage enforcement
4. Derived-state reconciliation
5. Universal orchestration enforcement
6. Certification snapshot hardening
7. Runtime repair/recovery tooling
8. Performance hardening

## Phase requirements summary

### 1) Runtime schema synchronization

- Migration checksum validation
- Migration ordering verification
- Startup schema verification
- Migration lock table
- Runtime schema audit tooling
- Required table: `schema_migration_integrity`
  - `migration_id`, `checksum`, `applied_at`, `runtime_hash`, `verification_status`
- Deployment must fail on missing migration/checksum mismatch/schema drift

### 2) DB invariant enforcement

Move critical enforcement to DB:

- Illegal workflow transitions blocked
- Certified projects immutable
- Evidence overwrite impossible
- Orphan records impossible
- Invalid assignments impossible
- Duplicate role assignment impossible
- Duplicate project-credit mapping impossible

Enforce with CHECK/UNIQUE/FK/triggers/transaction-safe procedures.

### 3) Immutable lineage enforcement

Append-only tables:

- `workflow_history`
- `audit_logs`
- `override_logs`
- `certification_snapshots`
- `document_versions`
- `validation_snapshots`

Block UPDATE/DELETE, enforce append-only triggers, and add hash lineage (`previous_hash`/`current_hash`) for key chains.

### 4) Derived-state reconciliation engine

Deterministic sync chain:

- `submittal -> credit_stage -> project_credit -> project -> certification`

Required procedures:

- `recalculate_submittal_state()`
- `recalculate_credit_state()`
- `recalculate_project_state()`
- `recalculate_certification_state()`

Manual derived-state updates are forbidden outside orchestration.

### 5) Universal orchestration enforcement

Single workflow mutation path:

- `/api/workflow/transition`

Mandatory order:

- authenticate
- membership validation
- capability validation
- assignment validation
- project lock validation
- workflow legality validation
- validation engine execution
- concurrency validation
- mutation
- audit
- recalculation
- certification evaluation
- commit

Rollback entire transaction on any critical failure.

### 6) Certification snapshot hardening

Immutable certification snapshots must include:

- approved evidence versions
- validation snapshot
- scoring snapshot
- workflow snapshot
- assignment snapshot
- rule/manual version
- override lineage

Require `certification_snapshot_hash` and permanent `manual_version_id` binding.

### 7) Runtime repair/recovery tooling

Required procedures:

- `repair_project_state()`
- `repair_credit_state()`
- `verify_certification_integrity()`
- `rebuild_derived_states()`

Must support deterministic replay from immutable history.

### 8) Performance hardening

Mandatory indexing:

- workflow state
- project lineage
- assignment ownership
- certification lookup
- audit retrieval
- validation retrieval
- reconciliation queries

Add composite/partial indexes, materialized reporting views, and optimized reconciliation queries.

## Security and control requirements

- Universal RLS coverage
- Deterministic `project_id` lineage for all project-scoped entities
- `auth.uid() -> project_users -> active membership` enforcement on project data
- L5 overrides require reason, immutable logs, before/after snapshots, lineage preservation
- Concurrency model: last write wins + immutable approval snapshots
- Validation engine is universally authoritative; no transition bypass
- AI advisory only (no mutation/override/bypass)

## Production blockers

Do not deploy if any exist:

- incomplete RLS
- orchestration bypass
- missing immutable audit
- certification lock bypass
- validation bypass
- runtime schema drift

## Acceptance criteria

- Illegal workflow impossible
- Stale certification impossible
- Evidence overwrite impossible
- Cross-project leakage impossible
- Immutable audit provable
- Certification reconstructable
- Runtime drift detectable
- Derived states deterministic
- Universal orchestration enforced
