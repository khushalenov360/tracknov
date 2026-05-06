# Tracknov TODO (Updated from TRACKNOV_FINAL_HANDOFF_WITH_BUILD_PLAN.md)

Last updated: 2026-05-06 IST (Auditor enforcement implementation pass)
Primary source: `C:\Users\91922\Downloads\TRACKNOV_FINAL_HANDOFF_WITH_BUILD_PLAN.md`

## Priority
- `P0` = release blocker
- `P1` = production must-have
- `P2` = scale layer

---

## Runtime audit stabilization (from `artifacts/handoff/2/runtime_audit_developer_handoff.md`)

### P0 - Runtime integrity blockers
- [x] Add explicit `STATE_DESYNC` lifecycle support for derived-state failures after committed workflow mutations.
- [x] Block certification/final submission when any entity in hierarchy is marked `STATE_DESYNC`.
- [x] Build reconciliation engine (submittal -> credit_stage -> credit -> project -> certification) with deterministic retry behavior.
- [x] Add replay-safe retry worker/jobs for recalculation and derived-state repair.
- [x] Add runtime desync dashboard/repair queue visibility for admins.
- [x] Enforce transaction policy chain for critical actions:
  - authorize -> validate -> execute -> audit -> commit (or rollback all).
- [x] Add concurrency protection for transitions/reviews:
  - prevent double approvals, stale writes, conflicting transitions.
- [x] Prove rollback + recovery behavior in automated QA.

### P1 - Observability, alerting, and enforcement proofs
- [x] Add runtime observability metrics and counters:
  - failed transitions, validation failures, desync entities, audit failures, stale states, auth failures.
- [x] Add alert triggers for:
  - workflow bypass attempts, recalculation failures, audit failures, certification inconsistencies, RLS failures.
- [x] Add API enforcement audit to verify all write routes follow:
  - authenticate -> authorize -> validate -> workflow enforce -> audit -> recalculate -> commit.
- [x] Add DB enforcement audit to verify:
  - ENUM/FK/trigger/RLS/transition-protection/immutable-log coverage.
- [x] Add deployment-gate checklist automation:
  - runtime audit pass, security pass, rollback proof, reconciliation proof, concurrency proof.

### P2 - Runtime performance hardening
- [x] Add performance checks/SLO alerts for:
  - validation < 2s, transition < 1s, recalculation < 3s.

---

## Handoff-driven implementation track (artifacts)

Source bundle copied to:
- `C:\Users\91922\Documents\Codex\tracknov\harita\artifacts\handoff`
- Plan file: `C:\Users\91922\Documents\Codex\tracknov\harita\artifacts\IMPLEMENTATION_PLAN_FROM_HANDOFFS.md`
- Auditor baseline: `C:\Users\91922\Documents\Codex\tracknov\harita\artifacts\handoff\AUDITOR_DEVELOPER_HANDOFF.md`
- Governance rules: `C:\Users\91922\Documents\Codex\tracknov\harita\artifacts\handoff\TRACKNOV_IMPLEMENTATION_RULES_AND_ENGINEERING_GOVERNANCE.md`

Priority execution sequence:
- [~] WP-0 Platform guardrails (RLS + DB RBAC)
- [~] WP-1 DB validation/workflow engine
- [~] WP-2 IGBC core data model + project instantiation integrity
- [~] WP-3 Supabase API contract stabilization
- [~] WP-4 Assignment-level enforcement (upload + metadata update guarded for L0; rejection routes to assigned owner)
- [~] WP-5 Credits billing and ledger reliability
- [~] WP-6 Scoring/certification engine
- [~] WP-7 Copilot intelligence and conversational upload flow
- [~] WP-8 Project Admin + UX/UI role rendering
- [~] WP-9 E2E UAT and release readiness

---

## P0 - Immediate blockers

### Validation + Certification Scoring Final Handoff (Handoff/2) - P0
- [~] Add DB-governed rule architecture tables:
  - `manual_versions`
  - `rule_sets`
  - `rules`
  - `thresholds`
  - `mandatory_requirements`
  - `rule_dependencies`
- [~] Lock every project to immutable `manual_version_id` and enforce scoring against locked version only. (migration `0053` includes backfill + lock guard trigger)
- [~] Introduce certification-state authority (`NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `ELIGIBLE`, `CERTIFIED`, `INVALID`) with DB-derived transitions. (migration `0053`)
- [~] Enforce mandatory-credit failure behavior:
  - blocks certification issuance only
  - does not block operational workflow.
- [~] Add stale-state / revalidation cascade trigger baseline:
  - replacement/resubmission invalidates downstream validation state and re-triggers recomputation.
- [x] Enforce validation entry points coverage audit for:
  - upload, mapping, assignment, review, approval/rejection/clarification, submittal/credit/stage/project submission, scoring/recompute, overrides, replacement, resubmission.
- [x] Move `/api/projects/[id]/igbc-score` to DB-authoritative scoring path (RPC first, service fallback only when explicitly unavailable).

### TechLead execution + migration alignment (Handoff/2) - P0/P1
- [~] Ensure `documents -> submittals -> credit_stages -> project_credits` chain is the only execution path (no direct execution via templates).
- [~] Confirm/patch unique and FK guarantees from migration handoff SQL in active migration line. (migration `0054` alignment added)
- [~] Add no-op state guard at every transition endpoint (`if same state -> return`).
- [~] Ensure transition logs + override logs are append-only and complete for scoring-affecting changes.

### RBAC Security auditor consolidation (Handoff/2) - P0
- [x] Add explicit API rate-limit middleware coverage map (login, AI, upload, export, workflow).
- [x] Verify signed URL-only document access path and remove any direct/public URL fallbacks in APIs.
- [x] Run endpoint-by-endpoint RBAC closure report against capability engine with evidence links.

### Auditor baseline enforcement (new mandatory track)
- [~] Enforce frozen role flow strictly in all mutation APIs: `L1 assign -> L0 upload -> L1 review -> L3 validate`.
- [~] Add `ELIMINATED` end-state behavior with immutable history and queue exclusion after second rejection.
- [~] Enforce "assignment required before upload" for every submittal/document type path (all upload entry points).
- [~] Enforce single active assignee at DB constraint level and block L0 self-assignment across APIs.
- [~] Implement/verify append-only protection for immutable audit tables:
  - `audit_logs`
  - `workflow_history`
  - `document_versions`
  - `override_logs`
  - `assignment_logs`
- [~] Enforce validation-engine gate at all required checkpoints:
  - upload, mapping, review, approval, credit completion, stage submission, project submission.
- [~] Enforce derived-state recalculation for submittal -> credit_stage -> credit -> project on every transition.
- [~] Enforce API governance chain on all write routes:
  - authenticate -> authorize -> validate -> audit -> execute -> recalculate derived states.
- [x] Confirm and enforce AI advisory-only policy (no approve/reject/transition/override/state change capability).
- [~] Add/complete QA proofs for auditor-mandated checks:
  - assignment bypass block, direct state mutation impossible, audit immutability, eliminated docs removed from queue.

### AI auditor governance enforcement (new mandatory track)
- [x] Implement deterministic-first intent router (`status/validation/workflow` routes before LLM).
- [x] Add strict response normalizer with enforced shape:
  - `Assessment`, `Fit`, `Reason`, `Recommendation`, `Confirm`.
- [x] Implement unknown-data hard response:
  - `I cannot confirm this from your project data.`
- [x] Add confirmation gate so AI suggestions are non-executable until:
  - validation pass + explicit user confirmation.
- [x] Enforce project-scoped + role-scoped retrieval in all Copilot context builders.
- [x] Implement manual-version locking in Copilot context (`project manual` only; no generic fallback knowledge).
- [x] Add fallback engine that preserves response structure (no model/unavailable error text to end users).
- [x] Add AI interaction logging:
  - query, intent, model, context size, token usage, fallback used, latency.
- [x] Add prompt-injection sanitization for:
  - user prompts, parsed uploads, retrieved text chunks.
- [x] Add repeatability and adversarial tests:
  - hallucination traps, missing-data, prompt injection, contradictory evidence, fallback failures.
- [x] Enforce low-temperature policy (`0.0` to `0.3`) for compliance chat tasks.

### A) Copilot quality and behavior (critical)
- [x] Fix repetitive/mindless replies for follow-up prompts. (system prompt + focused context tightening)
- [x] Ensure file-analysis prompts (`explain/analyze/read this file`) always trigger analysis, not mapping loop.
- [x] Make Copilot suggest likely credits + confidence from guidebook/tracker context without forcing user-first mapping questions.
- [x] Keep chat tone human and contextual (no robotic fallback phrasing baseline).
- [x] Remove "temporary response issue" fallback loop and replace with contextual fallback.
- [x] Broaden file-question detection (`compare`, `recheck`, `check/read this file`) so follow-up prompts stay in file-analysis flow.

### B) Chat-driven file workflow
- [x] Copilot must analyze attached file and return:
  - [x] document type detected
  - [x] key data points found
  - [x] likely credit matches
- [x] Copilot must map/upload through chat command flow end-to-end.
- [x] Remove dead/button-only flows that do nothing.

### C) Project instantiation reliability
- [x] Ensure guidebook upload works reliably for Project Admin/Super User. (dedup/update-in-place behavior added for same file name; stale storage cleaned)
- [x] Ensure tracker import maps rows to project credits (no empty import result). (auto-instantiation + dynamic header mapping + stronger code parsing + unmatched diagnostics)
- [x] Ensure project workspace instantiates usable credit/submittal data after guidebook+tracker. (credit self-heal invoked on both guidebook and tracker import paths)

### D) Build correctness
- [x] Fix Copilot project-upload API type mismatch (`documentId` -> `id`) and restore clean production build.

### E) Critical closure gaps from handoff verification
- [x] DB-native Validation Engine baseline: `validation_rules`, `validation_results`, `validate_submittal()`.
- [x] DB-native Scoring Engine baseline: `credit_scores`, `certification_levels`, `recompute_credit_scores()`, `get_project_certification_summary()`.
- [x] DB-native Assignment Enforcement baseline: `assignments`, `is_assigned_user()` wired into L0 upload/update checks.
- [x] Threshold alignment updated to handoff (`40/50/60/80`) in service scoring logic.
- [x] L2 upload permission removed (`client` now read-only for document upload actions).
- [x] L3 bulk approve path disabled (`project_admin`/`super_admin` blocked in action + UI disables bulk controls).

---

## P1 - Build plan execution (strict order from handoff)

### Phase 1 - Foundation
- [~] User authentication system hardening.
- [x] Project creation + project_code generation.
- [x] `project_users` mapping/access control.
- [~] Role enforcement (L0/L1/L2/L3/L5). (extended sales API role gating to billing-access roles)

### Phase 2 - Core structure
- [~] Project -> Stage -> Credit mapping.
- [~] Credit loading from rulebook.
- [~] Submittal + document type structure per credit stage.

### Phase 3 - Document engine
- [x] Upload mapped to document type (not generic-only upload).
- [x] Versioning system mandatory for updates/resubmissions. (single latest enforced per doc stream + parent linkage)
- [x] Ownership enforcement (only assigned owner can upload/update a document type). (L0 uploads and metadata updates are guarded)

### Phase 4 - Review pipeline
- [x] L1 review layer.
- [x] L3 validation layer.
- [x] Strict state transition enforcement.

### Phase 5 - Task engine (auto)
- [x] Auto-generate tasks for upload/review/validate/fix. (assignment + clarification task materialization)
- [x] Role-specific task visibility.

### Phase 6 - Dashboard
- [x] L1 dashboard counts + credit breakdown.
- [x] L2 dashboard summary/progress view.

### Phase 7 - Stage system
- [~] Stage gating: Design -> Construction -> Handover.
- [x] Stage-wise submission packs.

### Phase 8 - Reviewer simulation
- [x] "Run Check" trigger.
- [x] Rule-based completeness/consistency/compliance checks.

### Phase 9 - Rulebook engine
- [~] AI extraction draft from guidebook/rulebook.
- [x] Admin validation UI. (project-level validation rules panel + create action)
- [~] Version locking per project.

---

## P1 - Functional rules from consolidated handoff

### Workflow model
- [~] Enforce lifecycle: `PENDING -> UPLOADED -> L1 REVIEW -> L3 VALIDATION -> APPROVED/REJECTED`.
- [x] No workflow skipping.
- [x] Rejected documents return only to assigned owner.

### Document responsibility assignment (critical)
- [~] L3 assigns each document type to one specific L0 owner.
- [x] Only assigned owner can upload/update.
- [x] Rejected item routes back to same owner.
- [x] Assignment auto-creates tasks.

### Submission and compliance
- [x] Include only latest approved documents in submission pack.
- [x] Mandatory completion rule: all mandatory docs approved.
- [~] Full audit logging for every critical action.

---

## P2 - Scale/optimization

- [x] Rulebook-aware RAG retrieval quality improvements for credit advice.
- [x] Reviewer simulation scoring enhancements.
- [x] Advanced analytics across stages and role performance.

---

## Guardrails (non-negotiable)
- [x] No deletion workflow for compliance records.
- [x] Versioning mandatory for all document updates.
- [~] Role-based access enforced at API level.
- [~] Tracknov remains workflow-first (not file-storage-first).

---

## Latest execution pass (2026-05-05 IST, adherence fix: credit assignment visibility)

### Completed in this pass
- Fixed missing Project Admin/Owner assignment section blocker in project workspace flow:
  - Added `assigned_user_id` to workspace credit typing/mapping path so assignment state is available in UI model.
  - Added backend assignment service path for credit contributor assignment with role checks and project-membership validation.
  - Added project workspace assignment form wiring for credit-level contributor assignment (Project Admin / Owner / Super User paths).
- Resolved server action form incompatibility that prevented the page/action from functioning:
  - `assignCreditContributorAction` now uses a form-compatible `Promise<void>` signature.
  - Error path now logs server-side and keeps UI path stable.
- Batch 1 + 2 (TechLead execution handoff) implementation pass:
  - Added migration `0048_batch12_submittal_workflow_alignment.sql`.
  - Enforced execution chain at DB trigger level: `project_document -> submittal -> credit_stage`.
  - Added/aligned `project_document.submittal_id` + indexing.
  - Added project-credit-aware stage uniqueness (`credit_stages(project_credit_id, stage)`).
  - Backfilled stage rows per `project_credit`.
  - Aligned submittal runtime fields (`project_id`, `credit_id`, `iteration`, `created_by`, `state`).
  - Replaced upload RPC with `project_document` + `p_submittal_id` aware version.
  - Fixed upload service RPC payload bug (`p_state` -> `p_status`) and now always sends `p_submittal_id`.
  - Added credit-stage resolver in upload service so submittal creation is no longer missing `credit_stage_id`.
  - Added workflow no-op guard in state engine (`current == new` returns early, no duplicate transition side-effects).

### Verification
- `npm run build` passed successfully after the fix.

### Status impact
- Credit assignment visibility/operability issue: **closed**.
- `assignment task materialization` advanced: contributor task queue now resolves from `assigned_user_id` first (role fallback second) in role task generation.
- `reviewer simulation run-check` implemented on submission page (`/projects/[id]/submission?runCheck=1`) with completeness/consistency/compliance findings.
- API RBAC sweep advanced for project artifact routes:
  - `audit-export`: review-role gate
  - `client-report`: billing/report access gate
  - `submission-pack`, `summary`, `tracker`: export-role gate (`canExportProjectArtifacts`)
- Continuing next with remaining partial P1 items (final endpoint-by-endpoint RBAC verification/UAT).

### Pending verification after this pass
- Apply migration `0048_batch12_submittal_workflow_alignment.sql` in target Supabase environment.
- Validate end-to-end upload from project page widget (the previous `invalid response` path) after migration.
- Confirm tracker/guidebook import + document upload + state transition flow in one integrated UAT pass.

## Latest execution pass (2026-05-06 IST, WP-9 automated UAT verification)

### Completed in this pass
- Readiness gates executed and passed:
  - `npm run build`
  - `npm run lint`
- Automated UAT suites executed and passed:
  - `npx playwright test tests/workflow-state-machine.spec.ts` -> **7/7 passed**
  - `npx playwright test tests/rbac-matrix.spec.ts` -> **3/3 passed**
  - `npx playwright test tests/production-readiness.spec.ts` -> **1/1 passed**
- Fixed stale RBAC matrix expectation to align with current enforced upload policy:
  - Updated `tests/rbac-matrix.spec.ts` upload allowlist to include:
    - `super_user`, `super_admin`, `project_admin`, `owner`, `consultant`, `architect`, `mep`, `contractor`
  - `client` remains blocked from uploads.

### Status impact
- `WP-9` moved to partial complete (`[~]`) with automated checks now green.
- Remaining for full close:
  - Supabase environment migration/application verification and role-by-role browser UAT on live data.

## Latest execution pass (2026-05-06 IST, auditor gap audit status mapping)

### Auditor P0 status snapshot
- Done: 1
- Partial: 7
- Missing: 2

### Missing items (must implement first)
1. `ELIMINATED` lifecycle after second rejection with queue exclusion and immutable history.
2. Append-only immutability enforcement on required audit/version tables.

### Partial items queued for completion
1. Frozen L1->L0->L1->L3 mutation path hardening across all mutation APIs.
2. Assignment-required enforcement hardening across all upload entry points.
3. Single active assignee guarantee at DB level + anti-self-assignment hard block.
4. Validation gate coverage expansion to all required checkpoints.
5. Derived-state recalculation hardening across submittal -> credit_stage -> credit -> project chain.
6. API governance chain consistency hardening on all write routes.
7. QA coverage completion for immutability and elimination behavior.

## Latest execution pass (2026-05-06 IST, one-pass auditor enforcement implementation)

### Implemented
- Added migration:
  - `C:\Users\91922\Documents\Codex\tracknov\harita\supabase\migrations\0051_auditor_enforcement_baseline.sql`
- Migration coverage includes:
  - `ELIMINATED` workflow-state support path.
  - `project_document.rejection_count` for second-rejection elimination policy.
  - DB guard: assignment required before upload (`trg_project_document_assignment_guard`).
  - DB constraint: single active assignee (`uq_assignments_single_active_owner_per_credit`).
  - Append-only trigger function + triggers for immutable log tables.
  - New append-only lineage tables:
    - `document_versions`
    - `assignment_logs`
    - `workflow_history`
    - `audit_logs`
  - Document overwrite guard (`trg_project_document_no_overwrite`).
  - Derived-state recalculation hooks from `project_document` mutations.
- Service-layer updates:
  - `lib/services/document-state-service.ts`
    - Added `ELIMINATED` terminal state.
    - Auto-eliminate on second rejection/clarification.
    - Persist and use `rejection_count`.
  - `lib/services/credit-service.ts`
    - Sync assignment writes to `assignments` table.
    - Deactivate prior active assignment before activating new assignee.
- Type/workflow updates:
  - `lib/types.ts` adds `ELIMINATED` to `DocumentStatus`.
  - `lib/data.ts` recognizes `ELIMINATED`.
  - `lib/workflow/types.ts` + `lib/workflow/machines.ts` include `eliminated` transition.
- QA update:
  - `tests/workflow-state-machine.spec.ts` now includes elimination transition check.

### Verification
- `npm run build` passed.
- `npx playwright test tests/workflow-state-machine.spec.ts` passed (8/8).

### Status impact
- `ELIMINATED` item moved from missing to partial pending live-schema/application verification.
- Append-only immutability item moved from missing to partial pending migration rollout + env-level proof.
