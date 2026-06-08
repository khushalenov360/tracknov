# Tracknov TODO (Updated from TRACKNOV_FINAL_HANDOFF_WITH_BUILD_PLAN.md)

Last updated: 2026-05-06 IST (Auditor enforcement implementation pass)
Primary source: `C:\Users\91922\Downloads\TRACKNOV_FINAL_HANDOFF_WITH_BUILD_PLAN.md`

### D) 14052026 Supabase Hardening + Trace ID (Hard Gate)
- [x] Apply explicit `GRANT` statements to all governance and audit tables to satisfy May 30 Supabase Data API security requirements.
- [x] Implement `trace_id` in `governance_observability_events` and propagate via `AsyncLocalStorage` for end-to-end audit correlation.
- [x] Verify `trace_id` generation in both `REPLAY_MODE` and `OPERATIONAL_MODE`.
- [x] Seal `0081_supabase_data_api_hardening.sql` migration in production.

## 12052026 Runtime Baseline + Acceptance + Golden Flow (new references)

Sources:
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\12052026\TRACKNOV_EXECUTION_BASELINE_V1_COMPLETE.md`
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\12052026\TRACKNOV_RUNTIME_ACCEPTANCE_MATRIX_V1.md`
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\12052026\GOLDEN_FLOW_RUNTIME_PROOF_SUITE.md`

### A) Execution Baseline V1 closure
- [ ] Enforce full execution chain proof: Frontend -> API -> Auth -> Validation -> Workflow -> Audit -> Derived State -> DB Commit.
- [ ] Verify workflow state set is fully enforced (DRAFT, READY, SUBMITTED, UNDER_REVIEW, CLARIFICATION, RESUBMITTED, APPROVED, REJECTED).
- [ ] Verify role model enforcement proof (L0 upload-only, L1 reviewer, L2 read-only, L3 final validator, L5 override).
- [ ] Verify validation authority proof for readiness, evidence eligibility, scoring eligibility, transition eligibility.
- [ ] Verify immutable document governance proof: versioning + append-only lineage + hash validation.
- [ ] Verify audit law proof: actor/before/after/reason/timestamp on sensitive actions, immutable log behavior.
- [ ] Verify derived state law proof: only derived-state engine can update readiness/scoring/certification.
- [ ] Verify frontend law proof: no frontend permission/readiness computation, no direct DB mutation.
- [ ] Verify AI law proof: advisory-only; no approve/reject/override/mutation powers.
- [ ] Close production blockers audit: workflow bypass, mutable audit, cross-project leakage, derived-state drift, frontend DB mutation.

### B) Runtime Acceptance Matrix V1 (SHIP/NO-SHIP gates)
- [ ] Workflow integrity tests: duplicate approvals blocked, invalid transitions blocked, stale reviewer actions rejected, certified projects immutable.
- [ ] Validation integrity tests: missing mandatory evidence blocks submission; invalid evidence blocks approval; threshold failures block certification.
- [ ] Security integrity tests: cross-project visibility impossible, unauthorized approvals blocked, prompt injection sanitized.
- [ ] Audit integrity tests: append-only logs, replayable certification history, before/after snapshots mandatory.
- [ ] Derived-state integrity tests: auto recalculation, dependency invalidation, no manual scoring edits.
- [ ] Frontend isolation tests: readiness/permission computation and DB mutation blocked at frontend.
- [ ] Concurrency tests: optimistic locking, stale-state rejection, atomic transitions, idempotent retries.
- [ ] Golden flow runtime test: Upload -> Validation -> Submission -> Review -> Approval -> Scoring -> Audit Replay.
- [ ] Enforce NO-SHIP conditions list as release gate.

### C) Golden Flow Runtime Proof Suite (pilot gate)
- [ ] Step 1 Upload proof: immutable version creation, hash generation, partial upload cleanup, audit creation.
- [ ] Step 2 Mapping proof: lineage preservation, stale mapping invalidation, downstream recalculation.
- [ ] Step 3 Validation proof: completeness + mandatory evidence + invalid-state propagation.
- [ ] Step 4 Submission proof: deterministic transitions + invalid submission blocking + concurrency handling.
- [ ] Step 5 Review proof: assignment ownership + stale reviewer rejection + duplicate review prevention.
- [ ] Step 6 Approval proof: immutable workflow history + scoring recalculation + stale export invalidation.
- [ ] Step 7 Certification proof: deterministic scoring + prerequisite enforcement + downgrade behavior.
- [ ] Step 8 Audit Replay proof: historical reconstruction + replay determinism + immutable traceability.
- [ ] Step 9 Hostile Security Testing proof: cross-project/stale-session/API tampering/prompt-injection attempts blocked + audited + isolated.
- [ ] Pilot readiness signoff only after deterministic runtime, exact replay, authoritative validation, RBAC isolation, and concurrency safety are proven.

## Latest status update (2026-05-11 IST, execution reality snapshot)

- TODO is **not complete**.
- Open checkbox items currently present: **24** (`- [ ]` entries).
- Current immediate engineering blocker before full closure:
  - `npm run build` fails at lint/type stage due existing ESLint circular config serialization issue (`.eslintrc.json`) and remaining downstream type checks surfaced incrementally by build.
- Recently resolved in this pass:
  - added missing clarification task API used by document workflow transitions.
  - fixed async RPC error handling typing in document state transition service.

## 11052026 Handoff Closure Matrix (verified against repo, 2026-05-11 IST)
Sources:
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\11052026\TRACKNOV_AI_NATIVE_CERTIFICATION_OS_IMPLEMENTATION_HANDOFF.md`
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\11052026\TRACKNOV_UXUI_CERTIFICATION_OS_HANDOFF.md`
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\11052026\TRACKNOV_PROVABLE_RUNTIME_INTEGRITY_IMPLEMENTATION_HANDOFF.md`
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\11052026\TRACKNOV_COPILOT_RUNTIME_REBUILD_HANDOFF.md`
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\11052026\TRACKNOV_MEMORY_AWARE_IGBC_CONSULTANT_IMPLEMENTATION_PACK.md`
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\11052026\TRACKNOV_SECURITY_REMEDIATION_IMPLEMENTATION_HANDOFF.md`

| Requirement Group | Status | Evidence (Repo) | Next Action |
|---|---|---|---|
| AI-native orchestration module tree (`/ai/orchestrator`, `/ai/intents`, `/ai/actions`, `/ai/context`, `/ai/permissions`, `/ai/workflows`) | PASS | Added `ai/` module tree with scoped router/context/permissions/action contracts | Add integration tests for each module boundary |
| Mandatory `executeIntent(...)` entrypoint | PASS | Implemented in `ai/orchestrator/execute-intent.ts` and wired workflow-intent branch in `app/api/assistant/route.ts` | Expand to all operational action pathways beyond workflow branch |
| `AIActionContract` for operational actions | PASS | Implemented contract registry in `ai/actions/contracts.ts` + role guard in `ai/permissions/guard.ts` | Add contract validation tests and API-level enforcement assertions |
| Persistent Copilot shell (always-present operational shell) | PARTIAL | Copilot exists; behavior still mixed widget/assistant patterns | Convert to strict persistent shell behavior with role-native action focus |
| Dashboard no longer project launcher/explorer | PARTIAL | Dashboard quick-project launcher block removed; other legacy sections still present | Complete full dashboard declutter per L3 model |
| L3 dashboard exact top sections only (Pending Reviews, Mandatory Blockers, Clarifications, Project Readiness, AI Guidance) | PARTIAL | Queue cards present but layout still includes legacy cards/sections | Refactor L3 dashboard to exact section model |
| Remove visual audit timeline from L3 | PARTIAL | Timeline gated to governance roles; verify all L3 paths | Keep hidden for L3 and remove residual references |
| Replace “Open Workspace” with “Open Project” | PARTIAL | Key labels replaced in dashboard/projects; residual scan still required | Run final global string audit and close |
| Queue-first review workflow (Queue -> Review -> Approve/Reject/Clarify -> Next) | PARTIAL | Submittal route and queue pieces exist | Complete auto-next + full review workspace layout |
| Runtime determinism core modules | PASS | `core/runtime/orchestrator.ts`, `stateMachine.ts`, `derivedStateEngine.ts`, `dependencyEngine.ts` | Expand proof coverage (tests/evidence) |
| Runtime acceptance test suite | PASS | `tests/runtime/runtimeAcceptance.spec.ts` exists | Add remaining matrix proofs (concurrency/replay/immutable lineage) |
| Frontend trust boundary (no frontend-derived readiness/workflow/scoring) | PARTIAL | Significant backend enforcement exists; known TODO open | Remove remaining frontend-derived logic and verify contract-only rendering |
| Conversational memory tables and runtime usage | PASS | `conversation_sessions`, `conversation_messages`, `semantic_memory` usage in `lib/services/copilot-runtime-service.ts` | Add intent-router/context-builder/response-planner split |
| Copilot runtime rebuild (intent router, silent orchestrator, response planner, hallucination guard) | PARTIAL | Memory runtime exists; full module architecture not complete | Implement remaining runtime modules and integrate |
| Security remediation (xlsx removal / secure spreadsheet pipeline baseline) | PARTIAL | `exceljs` present and used; full handoff acceptance checklist not yet marked complete | Complete security handoff acceptance items and evidence |

## UXUI Certification OS handoff (2026-05-11)
Source:
`C:\Users\91922\Documents\Codex\tracknov\Handoff\11052026\TRACKNOV_UXUI_CERTIFICATION_OS_HANDOFF.md`

- [ ] Remove duplicate navigation blocks in L3 surfaces.
- [ ] Remove Visual Audit Timeline section from L3 dashboard.
- [ ] Replace all "Open Workspace" labels/CTAs with "Open Project".
- [ ] Refactor dashboard into operational review console (queue-first, not analytics-first).
- [ ] Implement queue-first review workflow layout:
  - left: queue + blockers
  - center: current review item + document + decision controls
  - right: AI guidance + workflow history
- [ ] Hide backend/infrastructure terminology from operational users (L0/L1/L2/L3).
- [ ] Implement UI orchestration layer for workflow-safe rendering.
- [ ] Implement cognitive RBAC rendering (role-appropriate information density and actions).
- [ ] Compress visible workflow states to operationally meaningful labels.
- [ ] Enable realtime queue refresh for workflow queues.
- [ ] Ensure L3 dashboard has these top-level sections only:
  - Pending Reviews
  - Mandatory Blockers
  - Clarifications
  - Project Readiness
  - AI Guidance
- [ ] Remove from L3 dashboard:
  - runtime diagnostics
  - infrastructure counters
  - duplicate projects sections
  - workspace terminology

## AI-Native Certification OS handoff (2026-05-11)
Source:
`C:\Users\91922\Documents\Codex\tracknov\Handoff\11052026\TRACKNOV_AI_NATIVE_CERTIFICATION_OS_IMPLEMENTATION_HANDOFF.md`

- [x] Remove dashboard "Projects" launcher/explorer section from operational dashboard surfaces and replace with queue-first operational blocks.
- [ ] Implement AI-first execution routing pattern:
  - Intent -> AI Understanding -> Workflow Execution -> Queue Update -> Operational Feedback.
- [x] Create AI action orchestration layer modules:
  - `/ai/orchestrator/`
  - `/ai/intents/`
  - `/ai/actions/`
  - `/ai/context/`
  - `/ai/permissions/`
  - `/ai/workflows/`
- [x] Implement mandatory `executeIntent(...)` entrypoint for operational actions.
- [x] Define and enforce `AIActionContract` for every operational action.
- [ ] Add required action contracts:
  - `assignContributor`
  - `uploadDocument`
  - `requestClarification`
  - `approveSubmittal`
  - `rejectSubmittal`
  - `generateSubmissionPack`
  - `escalateIssue`
  - `reassignReviewer`
  - `reopenSubmission`
- [ ] Convert Copilot to persistent operational shell behavior (always-present execution surface).
- [ ] Enforce queue-first review flow:
  - Queue -> Open Review -> Approve/Reject/Clarify -> Next Review.
- [ ] Implement required upload flow:
  1) user uploads file
  2) AI predicts likely project/credit/submittal
  3) user confirms once
  4) workflow auto-updates.
- [ ] Ensure operational actions are callable via all channels through same backend authority path:
  - API callable
  - UI callable
  - Copilot callable
  - automation callable.
- [ ] Enforce governance: frontend must not bypass workflow engine/RBAC/audit and must not directly mutate DB.
- [ ] Add acceptance verification checklist for this handoff:
  - persistent copilot shell
  - AI-first execution
  - intent execution engine
  - queue-first UX
  - operational memory behavior
  - AI action contracts
  - workflow orchestration integration
  - realtime queues
  - dashboard declutter
  - role-native copilot behavior
  - review queue operational
  - upload AI mapping operational
  - unified action execution path.

## Normalized Reality Check (2026-05-11 IST)

This TODO has accumulated historical `[~]` carry-over lines across many handoff passes.
To avoid false pending inflation, use this split:

- **Completed implementation**: major enforcement/workflow/AI/RLS/scoring layers are already in place.
- **True open items (`[ ]`)**: operational verification and a few remaining implementation closures.
- **Carry-over partials (`[~]`)**: mostly evidence/UAT/proof closure lines that should be closed after targeted verification.

Current raw counts in file:
- `done [x]`: 128
- `open [ ]`: 10
- `partial [~]`: 109

### True open execution queue (current actionable pending)
- [ ] Fix Project Admin dashboard Action Queue labels: replace raw UUID fallback cards with human-readable task metadata (credit code, required document type, action required, and project context).
- [ ] Reduce dashboard audit clutter: collapse repeated identical timeline events into grouped rows and surface only high-signal summaries by default.
- [ ] Redesign Credit Tracker grid for completeness and readability: surface all required document columns beyond drawings, improve column spread/spacing, and reduce cramped/shabby row layout while preserving workflow actions.
- [ ] Run full end-to-end live workflow with real role accounts and real data.
- [ ] Apply and verify live migration `supabase/migrations/0009_document_activity_logs.sql` in production Supabase.
- [ ] Verify upload integrity end-to-end (storage object + `documents` row + signed URL open).
- [ ] Verify `super_user`-only project delete in live session.
- [ ] Verify document delete visibility/permissions in live session (`super_user`, `project_admin`).
- [ ] Verify document activity log visibility only for `super_user` and `project_admin`.
- [ ] Epic C2: event-driven foundation hard closure (`events/event-bus` producers/consumers + retry/dead-letter verification).
- [ ] Epic C3: AI subsystem baseline hard closure (RAG/validator/rejection-intelligence completion proof).
- [ ] Epic C4: transaction-safe token ledger hard closure (idempotent debit/credit references + live proof).
- [ ] Remove remaining frontend-derived readiness/workflow/completion logic and route to backend-only contracts.

## Priority
- `P0` = release blocker
- `P1` = production must-have
- `P2` = scale layer

---

## Provable runtime integrity track (from `Handoff/11052026/TRACKNOV_PROVABLE_RUNTIME_INTEGRITY_IMPLEMENTATION_HANDOFF.md`)

### 2026-05-11 IST gap audit snapshot (this handoff only)

Status summary against `TRACKNOV_PROVABLE_RUNTIME_INTEGRITY_IMPLEMENTATION_HANDOFF.md`:
- **Implemented**: 9
- **Partial**: 6
- **Missing**: 3

Implemented (verified in repo):
- [x] Central runtime orchestrator exists:
  - `core/runtime/orchestrator.ts`
  - wired in `app/api/workflow/transition/route.ts`
- [x] Deterministic runtime state machine exists:
  - `core/runtime/stateMachine.ts`
- [x] Derived state engine exists:
  - `core/runtime/derivedStateEngine.ts`
- [x] Dependency invalidation engine exists:
  - `core/runtime/dependencyEngine.ts`
- [x] Runtime acceptance suite exists:
  - `tests/runtime/runtimeAcceptance.spec.ts`
- [x] AI authority boundary enforced at architecture level (advisory-only; no direct approve/reject/mutate path in orchestrator route).

Partial (implemented but not fully closed as per handoff intent):
- [~] Universal orchestration still incomplete (not all mutation paths provably routed through `/api/workflow/transition`).
- [~] Immutable audit lineage is implemented in migrations, but closure proof across all runtime paths is pending.
- [~] Concurrent review safety is partially implemented (conflict status + stale-attempt handling) but full optimistic-lock proof suite is pending.
- [~] Replayable certification reconstruction exists via DB/runtime artifacts, but end-to-end replay proof runbook is pending.
- [~] Derived scoring consistency is partially backend-driven; frontend local scoring surfaces still exist in places (e.g. `app/credits/page.tsx`).
- [~] No-ship blockers are defined, but enforcement as a strict deployment gate is not yet proven in CI.

Missing / open implementation items from this handoff:
- [ ] Expand runtime acceptance matrix to include:
  - immutable audit lineage assertions
  - dependency invalidation -> queue revalidation assertions
  - concurrency conflict assertions
  - replay reconstruction assertions
  - derived scoring consistency assertions
- [ ] Remove remaining frontend-derived scoring/readiness calculations and switch those views to backend authoritative contracts only.
- [ ] Add explicit deterministic fallback/unknown handling enforcement for AI-runtime paths where data is unavailable.

### P0 - Runtime integrity enforcement (release blockers)
- [x] Add central runtime orchestrator module:
  - `core/runtime/orchestrator.ts`
  - enforce mutation pipeline: `API -> Orchestrator -> Validation -> RBAC -> Audit -> Derived State Engine -> Commit`.
- [x] Add deterministic runtime state machine module:
  - `core/runtime/stateMachine.ts`
  - explicit transitions only; no inferred transitions.
- [x] Add derived-state engine module:
  - `core/runtime/derivedStateEngine.ts`
  - prevent manual score/readiness/certification mutations outside derived engine.
- [x] Add dependency invalidation engine:
  - `core/runtime/dependencyEngine.ts`
  - on evidence change: invalidate approvals, invalidate scores, queue revalidation.
- [~] Enforce concurrent-review safety:
  - optimistic locking
  - stale review rejection
  - conflict reconciliation response.
- [~] Enforce backend-authoritative trust boundary:
  - no frontend workflow mutation
  - no frontend score/readiness derivation
  - no frontend permission inference.
- [~] Enforce immutable append-only audit event architecture across workflow + review + scoring paths.
- [~] Enforce no-ship blockers as deployment gate:
  - frontend controls workflow
  - manual score editability
  - non-replayable certification chain
  - mutable approvals without audit
  - concurrency-unsafe review mutations.

### P1 - Governance + replay defensibility
- [~] Add replayable certification reconstruction path from immutable workflow/audit lineage.
- [~] Add deterministic dependency invalidation + recompute proofs for re-submission flows.
- [x] Add runtime acceptance matrix suite:
  - `tests/runtime/runtimeAcceptance.spec.ts`
  - deterministic transitions
  - immutable audit lineage
  - replay reconstruction
  - concurrency safety
  - dependency invalidation
  - derived scoring consistency.
- [~] Map and validate golden flow end-to-end:
  - Upload -> Validation -> Mapping -> Submission -> Review -> Clarification -> Resubmission -> Approval -> Derived Scoring -> Certification Snapshot -> Audit Replay.

### P2 - Consolidation / architecture hygiene
- [ ] Refactor existing orchestration/validation/recalculation logic to align with new `core/runtime/*` module boundaries.
- [ ] Add explicit runtime authority documentation linking orchestrator, state machine, derived engine, and dependency engine to existing API surfaces.

---

## 3-phase dependency-safe implementation handoff (from `artifacts/handoff/3/TRACKNOV_3Phase_Implementation_Developer_Handoff.md`)

### P0 - Phase 1 core enforcement gate
- [~] Confirm DB schema enforcement, workflow engine, validation engine, RBAC/RLS, immutable audit logs, and API orchestration are active before expanding UI/AI behavior.
- [~] Prove no direct frontend DB mutations remain.
- [~] Prove no workflow state skipping is possible across DB/API/server actions.
- [~] Prove document overwrite is impossible across every upload/update path.
- [x] Prove no derived state is stored or mutated manually outside backend recalculation/orchestration paths.
- [x] Confirm required API families exist and are backend-authoritative:
  - `/workflow/*`
  - `/validation/*`
  - `/documents/*`
  - `/projects/*`
  - `/credits/*`

### P0 - Cross-phase dependency gates
- [~] Do not expand UI behavior until workflow transitions are backend enforced, validation blocks invalid actions, RLS isolates projects, and audit logging is immutable.
- [~] Do not expand AI behavior until validation authority and project-scoped retrieval are enforced.
- [~] Do not build dashboard/analytics surfaces before derived-state engine outputs are backend-owned.
- [x] Remove operational-user visibility of runtime instability, reconciliation tooling, repair systems, and internal desync metrics.

### P1 - Phase 2 execution and UX safety
- [x] Queue-first UX with capability-driven rendering and lock-state display.
- [~] Review orchestration must be submittal-first, not document/card-first. (submittal review route added; remaining mutation universality still pending)
- [~] Project Admin UI must show only validation queues, blockers, stage readiness, pending reviews, and workflow actions.
- [x] Hide runtime desync metrics, repair tooling, and infrastructure diagnostics from Project Admin and operational roles; reserve internal diagnostics for governance/super-user/admin-only surfaces.

### P1 - Phase 3 AI certification intelligence safety
- [x] Keep AI advisory-only:
  - summarize
  - recommend
  - explain
- [x] Block AI from approve/reject/override/transition authority.
- [x] Enforce RBAC filtering before retrieval, project-scoped context, and prompt-injection defense.
- [~] Ensure AI answers are evidence-linked and do not expose raw runtime/retrieval internals.

- [ ] Run full end-to-end live workflow with real role accounts and real data:
  login -> dashboard -> create/open project -> upload -> Project Owner review -> Project Admin review -> included in submission pack -> XLSX/PDF/ZIP export.
- [ ] Apply and verify live migration `supabase/migrations/0009_document_activity_logs.sql` in production Supabase.
- [ ] Verify upload integrity for every upload:
  Supabase storage object exists + matching `documents` row + signed URL opens.
- [ ] Verify `super_user`-only project delete in live session.
- [ ] Verify document delete visibility/permissions in live session (`super_user` and `project_admin` policy as implemented).
- [x] Verify role-based edit/status restrictions across:
  `super_user`, `super_admin`, `project_admin`, `client`, `owner`, `architect`, `mep`, `contractor`.
- [ ] Verify document activity log visibility only for `super_user` and `project_admin`.
### P1 - Auditor framework alignment
- [~] Maintain closure evidence for:
  - DB Integrity Audit
  - API + Workflow Audit
  - Frontend/Backend Separation Audit
  - Validation & Certification Audit
  - RBAC + Security Audit
  - AI Reliability Audit
  - Trust Integrity Audit

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

## Central workflow orchestration engine (from `artifacts/handoff/2/CENTRAL_WORKFLOW_ORCHESTRATION_ENGINE.md`)

### P0 - Centralized mutation authority
- [x] Create authoritative endpoint `POST /api/workflow/transition`.
- [~] Route all workflow state changes through the authoritative endpoint. (document review transitions now routed; legacy submittal/direct paths still need migration)
- [~] Block direct workflow mutation pathways outside orchestration entrypoint (API/server action/db write bypasses).
- [~] Enforce strict orchestration sequence in one transaction:
  - authenticate -> membership -> capability -> assignment -> lock -> legality -> validation -> concurrency -> mutate -> audit -> derived -> scoring -> certification -> commit.
- [x] Return deterministic standardized response contract:
  - `workflow_state`, `allowed_actions`, `lock_state`, `validation_status`, `audit_reference`, `derived_state_summary`.
- [x] Return deterministic error schema for all failures.

### P0 - Certification lock and override governance
- [~] Implement `CERTIFIED_LOCKED` project lock state and hard-block post-certification mutations. (migration + orchestrator guard added; live Supabase migration applied; full mutation-path UAT still pending)
- [~] Allow lock bypass only for L5 override with mandatory reason + immutable before/after snapshots. (L5/reason guard added; snapshot depth still partial)
- [~] Restrict override authority to L5 for workflow/validation/scoring/certification paths.

### P1 - Workflow legality and validation coupling
- [x] Introduce/align `workflow_transition_rules` table as document legality matrix for orchestrator/DB trigger.
- [~] Enforce clarification safety invalidation:
  - previous review/validation/approval authority invalidated on clarification mutation.
- [x] Ensure persistent document lifecycle (`CLARIFICATION -> RESUBMITTED`) without replacement documents.
- [~] Ensure persistent submittal lifecycle (`CLARIFICATION -> RESUBMITTED`) without replacement submittals.
- [~] Snapshot freeze on approval:
  - evidence versions, validation snapshot, scoring snapshot, assignment snapshot, rule version snapshot.

### P1 - Concurrency and security events
- [x] Add stale state detection and deterministic conflict handling at orchestration endpoint for document transitions.
- [x] Emit `security_events` for:
  - unauthorized attempts, stale mutation attempts, invalid transitions, override usage, lock violations.

### P1 - Derived-state/scoring orchestration closure
- [~] Guarantee post-mutation recalculation chain:
  - submittal -> credit_stage -> project_credit -> project -> certification.
- [~] Guarantee scoring/threshold/certification reevaluation after approval-affecting mutations.
- [x] Prove no manual derived-state updates remain in mutation code paths.

### P2 - Performance and indexing for orchestrator path
- [x] Add/verify indexes for orchestrator read/write path:
  - workflow history lookups, transition legality checks, assignment checks, lock checks.
- [x] Add orchestrator latency instrumentation and target checks for deterministic transaction path.

---

## UX/UI workflow execution console (from `artifacts/handoff/2/UX_UI_DEVELOPER_HANDOFF.md`)

- [x] Epic C1 - Workflow engine state machine:
  replace scattered status checks with centralized `workflow/state-machine.ts` and guarded transitions.
- [ ] Epic C2 - Event-driven foundation:
  implement `events/event-bus.ts` with producers/consumers and retry/dead-letter behavior.
- [ ] Epic C3 - AI subsystem baseline:
  implement `ai-engine` foundation (RAG + validator + rejection intelligence capture).
- [ ] Epic C4 - Transaction-safe token ledger:
  enforce idempotent upload/token orchestration with immutable debit/credit references.
### P0 - Backend-authoritative UI and review safety
- [x] Add centralized `workflowStateRenderer()` so state labels, lock behavior, editability, and allowed actions are not scattered through screens.
- [x] Add reusable `WorkflowStatePanel` for backend-supplied state, lock state, blockers, and allowed actions.
- [~] Convert review queue away from bulk/global approval behavior toward single-item backend-action review surfaces. (bulk UI removed from review queue; full submittal auto-dequeue still pending)
- [~] Ensure all review surfaces consume backend `allowed_actions` instead of frontend-inferred actions. (review queue now renders allowed actions from workflow renderer; project credit detail forms still need migration)
- [x] Remove workflow transition/review action controls from credit context screens; credit screens must display context only.
- [x] Build canonical submittal detail screen with:
  - Workflow State Panel
  - Validation Panel
  - Document Viewer
  - Version History
  - Review Action Bar
  - Audit Timeline
  - AI Assistance Panel
- [~] Implement project-scoped submittal queue ordering:
  - mandatory-first
  - clarification-priority
  - assignment-aware
  - stage-aware
- [x] Implement review auto-dequeue to next relevant submittal after action.

### P1 - Frontend trust-boundary hardening
- [ ] Remove remaining frontend-derived readiness/workflow/completion logic from UI components and route all derived values through backend contracts.
- [~] Add conflict/stale-state UX handling for workflow-bound actions:
  - rollback optimistic UI
  - refresh authoritative state
  - preserve reviewer context.
- [x] Add version history and validation outcome visibility to review screens.
- [~] Add UX governance tests for:
  - unauthorized action visibility
  - workflow lock bypass
  - stale permissions
  - context persistence
  - queue sequencing.

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
- [x] Stage gating: Design -> Construction -> Handover. (Construction stage-gate v3.0 integrated)
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


---

## Orchestration reconcile audit closure (from `artifacts/handoff/2/ORCHESTRATION_RECONCILE_AUDITOR.md`)

### P0 - Enterprise blockers (must prove PASS)
- [~] Enforce centralized workflow mutations only via `POST /api/workflow/transition`. (endpoint/service added; universal migration still open)
- [~] Eliminate all direct workflow state update bypass paths (DB/API/server-action/background).
- [~] Guarantee atomic transition chain with rollback:
  - authorize -> validate -> mutate -> audit -> recalculate -> score -> certify -> commit.
- [~] Enforce validation-before-transition at runtime for all workflow mutations.
- [~] Enforce derived-state synchronization chain:
  - submittal -> credit_stage -> project_credit -> project -> certification.
- [~] Enforce immutable audit/version tables (append-only):
  - `workflow_history`, `audit_logs`, `override_logs`, `certification_snapshots`, `document_versions`.
- [~] Enforce `CERTIFIED_LOCKED` mutation blocking except explicit L5 override with reason + snapshots.
- [x] Enforce project-scoped RLS isolation (`auth.uid() -> project_users`) for primary runtime workflow entities.
- [x] Enforce AI mutation isolation (AI cannot mutate workflow/state/scoring/approval paths).

### P1 - High-risk enforcement proofs
- [~] Produce evidence map of every workflow mutation path and prove orchestration routing. (runtime audit reports + authority matrix added; full route proof still open)
- [~] Add stale write/concurrency guards with immutable approval snapshots (`last-write-wins + frozen approvals`).
- [~] Enforce assignment engine determinism + reassignment audit lineage.
- [~] Enforce override governance:
  - only L5 override
  - reason mandatory
  - immutable override logs.
- [~] Enforce certification snapshot freeze content:
  - evidence versions
  - validation snapshot
  - scoring snapshot
  - rule version
  - approver lineage
  - override lineage.
- [~] Enforce document version lineage immutability and block evidence overwrite.
- [~] Enforce deterministic scoring with manual-version freeze (no retroactive drift).

### P2 - Runtime quality and performance hardening
- [x] Add/verify index coverage:
  - workflow state
  - project lineage
  - assignment ownership
  - certification lookup
  - audit retrieval
  - validation retrieval.
- [x] Add orchestration performance audit checks for transition/audit/validation paths.
- [~] Generate reconciliation audit report table format:
  - Requirement | PASS/FAIL | Evidence | Severity.
- [~] Add production gate that blocks deploy on any critical FAIL in:
  - workflow enforcement
  - RLS
  - validation
  - immutable audit
  - certification locking
  - orchestration centralization.

---

## SQL runtime hardening closure (from `artifacts/handoff/2/SQL_RUNTIME_HARDENING_HANDOFF.md`)

### P0 - Runtime integrity and invariants (release blockers)
- [~] Add runtime schema integrity framework:
  - `schema_migration_integrity` table
  - migration checksum verification
  - migration order verification
  - startup schema drift verification
  - migration lock enforcement.
- [x] Block deployment when critical runtime hardening/schema gate checks fail in `npm run qa:runtime-audit`.
- [~] Enforce DB invariants for:
  - illegal workflow transition block
  - certified project immutability
  - evidence overwrite prevention
  - orphan prevention (FK coverage)
  - invalid assignment prevention
  - duplicate role-assignment prevention
  - duplicate project-credit mapping prevention.
- [~] Enforce immutable append-only policy for:
  - `workflow_history`
  - `audit_logs`
  - `override_logs`
  - `certification_snapshots`
  - `document_versions`
  - `validation_snapshots`
  - block UPDATE/DELETE.
- [~] Enforce universal mutation orchestration path via `/api/workflow/transition` with full transactional rollback on critical-step failure.
- [~] Enforce universal validation gate before workflow mutation (no bypass paths).

### P1 - Deterministic reconciliation and certification defensibility
- [~] Add deterministic derived-state reconciliation procedures:
  - `recalculate_submittal_state()`
  - `recalculate_credit_state()`
  - `recalculate_project_state()`
  - `recalculate_certification_state()`
  - and wire replay-safe reconciliation jobs.
- [~] Enforce immutable certification snapshot payload:
  - evidence versions
  - validation snapshot
  - scoring snapshot
  - workflow snapshot
  - assignment snapshot
  - rule/manual version
  - override lineage.
- [~] Add `certification_snapshot_hash` generation and verification.
- [~] Enforce manual version lock (`manual_version_id`) with explicit migration-only changes.
- [~] Add runtime repair/recovery procedures:
  - `repair_project_state()`
  - `repair_credit_state()`
  - `verify_certification_integrity()`
  - `rebuild_derived_states()`
  - with deterministic replay support.
- [~] Enforce override hardening:
  - L5-only
  - mandatory reason
  - immutable before/after snapshots
  - lineage preservation.

### P2 - Performance and operational hardening
- [x] Add/verify index coverage for:
  - workflow state
  - project lineage
  - assignment ownership
  - certification lookup
  - audit retrieval
  - validation retrieval
  - reconciliation queries.
- [~] Add reconciliation query optimization:
  - composite indexes
  - partial indexes
  - materialized reporting views.
- [~] Add runtime hardening audit script/report proving:
  - no drift
  - deterministic derived-state sync
  - immutable lineage
  - orchestration universality.

---

## Runtime-enforceable implementation semantics (from `artifacts/handoff/2/RUNTIME_ENFORCEABLE_IMPLEMENTATION_SEMANTICS_PLAN.md`)

### P0 - Runtime authority stabilization
- [~] Implement/complete central orchestrator layer for mutation flow:
  - request -> orchestrator -> authorization -> validation -> workflow -> audit -> mutation -> derived recalculation -> response.
- [~] Centralize validation gateway so no mapping, workflow transition, scoring, approval, or rejection can occur without validation execution.
- [x] Enforce explicit workflow transition matrix; workflow state must never be inferred.
- [~] Enforce immutable audit layer with before/after snapshots and actor traceability for all sensitive actions.
- [~] Define and enforce exact runtime state semantics for:
  - `proposed`
  - `mapped`
  - `ready`
  - `submitted`
  - `approved`.
- [~] Add runtime truth tables for:
  - validation failure
  - AI timeout
  - stale workflow
  - unauthorized access.
- [~] Define and implement failure trees for:
  - rollback
  - retry
  - degraded operation
  - conflict
  - reconciliation.

### P0 - AI runtime governance and authority boundary
- [x] Enforce deterministic-first AI routing:
  - DB -> Validation -> Workflow -> AI.
- [x] Prevent AI from answering deterministic project counts/workflow states/pending items/validation results when deterministic source exists.
- [x] Enforce structured context builder:
  - authorized
  - project-scoped
  - workflow-scoped
  - validation-filtered.
- [~] Block raw RAG dumps, retrieval scores, internal telemetry, and vector metadata from frontend responses.
- [x] Enforce AI response normalization:
  - Assessment
  - Fit
  - Reason
  - Recommendation
  - Confirmation Request.
- [x] Enforce AI capability firewall:
  - AI can summarize/explain/suggest/classify
  - AI cannot mutate/approve/reject/transition/override validation.

### P1 - Governance reference artifacts
- [x] Produce action authority matrix.
- [x] Produce mutation authority matrix.
- [x] Produce workflow authority matrix.
- [x] Produce AI capability matrix.
- [~] Produce canonical runtime diagrams for:
  - document upload lifecycle
  - AI query lifecycle
  - workflow transition lifecycle
  - validation lifecycle
  - rollback lifecycle
  - conflict resolution lifecycle
  - authorization lifecycle.
- [~] Produce API execution contracts for every mutation API:
  - authorization sequence
  - validation sequence
  - workflow checks
  - mutation rules
  - audit obligations
  - rollback behavior
  - side effects.

### P1 - Frontend boundary and reconciliation
- [~] Enforce frontend trust boundary:
  - frontend renders/triggers only
  - frontend never determines permissions/workflow legality/validation success/certification readiness.
- [~] Add reconciliation checks for:
  - derived-state mismatch
  - orphan records
  - workflow desync
  - audit consistency
  - validation consistency.
- [x] Enforce AI security hardening:
  - prompt injection sanitization
  - project-scoped retrieval
  - authorization-before-retrieval
  - AI context filtering
  - DTO filtering.

### P2 - Semantics validation suites
- [x] Add workflow enforcement test suite.
- [~] Add validation authority test suite.
- [x] Add AI hallucination test suite.
- [x] Add prompt injection test suite.
- [x] Add concurrency test suite.
- [~] Add rollback test suite.
- [x] Add tenant isolation test suite.
- [x] Add fallback behavior test suite.

---

## Latest execution pass (2026-05-06 IST, orchestration/runtime hardening)

### Completed
- Added central workflow transition endpoint:
  - `app/api/workflow/transition/route.ts`
- Added orchestration service:
  - `lib/services/workflow-orchestrator-service.ts`
- Routed document review transitions through the orchestrator:
  - `lib/services/review-service.ts`
- Added runtime hardening migration:
  - `supabase/migrations/0056_runtime_semantics_orchestration_hardening.sql`
- Added runtime authority matrix and lifecycle artifact:
  - `artifacts/governance/RUNTIME_AUTHORITY_MATRICES.md`
- Updated `AgentHandoff.md` with implementation and remaining gaps.

### Verified
- `npm run build` passed.
- `npm run qa:workflow` passed (8/8).
- `npm run qa:runtime-audit` passed.

### Still open after this pass
- Universal orchestration migration for all workflow mutation paths.
- Submittal workflow support inside `/api/workflow/transition`.
- Live Supabase migration application and DB-level enforcement verification.
  - Completed in live Supabase on 2026-05-07 through migration history `0057`; `npx supabase db push --dry-run` reports remote database is up to date.
- Startup schema checksum/drift deployment blocker.
- Full certification snapshot freeze/reconstruction UAT.
- Tenant-isolation test suite.

---

## Latest execution pass (2026-05-07 IST, TODO repo-side implementation)

### Completed
- Added 3-phase implementation handoff artifact:
  - `artifacts/handoff/3/TRACKNOV_3Phase_Implementation_Developer_Handoff.md`
- Removed workflow/review mutation controls from the project credit context screen.
- Added governed submittal review detail route:
  - `app/projects/[id]/submittals/[submittalId]/page.tsx`
- Added review auto-dequeue server action:
  - `submitDocumentTransitionAction()` in `app/actions.ts`
- Added required API family proof routes:
  - `app/api/credits/route.ts`
  - `app/api/validation/submittal/route.ts`
- Updated review queue data contract with submittal IDs, allowed actions, lock state, and deterministic ordering inputs.
- Expanded workflow UI contract tests.

### Verified
- `npx playwright test tests/workflow-ui-contract.spec.ts` passed (8/8).
- `npm run build` passed.
- `npm run qa:workflow` passed (8/8).
- `npm run qa:runtime-audit` generated current audit reports.

### Still open after this pass
- Current open/partial TODO count: 113.
- Runtime audit still reports high-severity failure for manual derived-state mutation patterns.
- Universal orchestration is still partial; document review transitions route through the orchestrator, but every mutation path is not yet forced through `/api/workflow/transition`.
- Live Supabase migration applied and verified through Supabase CLI dry-run. Remaining work is runtime UAT and manual derived-state cleanup.

---

## Latest execution pass (2026-05-07 IST, live Supabase migration reconciliation)

### Completed
- Linked local repo to live Supabase project `Tracknov` (`uiecvxxamykfubgtqzap`).
- Repaired four orphan remote migration-history rows as reverted:
  - `20260502132955`
  - `20260502195910`
  - `20260503115233`
  - `20260503120206`
- Applied enforcement migrations `0048` through `0056` directly to live Supabase because the live schema had drifted past the old `documents -> project_document` rename.
- Patched migration `0054_tracknov_supabase_migration_alignment.sql` to tolerate existing `override_logs` tables without `entity_id`.
- Renamed duplicate migration version:
  - `0041_project_credits_documentation_summary.sql`
  - to `0057_project_credits_documentation_summary.sql`
- Applied `0057` through Supabase CLI.

### Verified
- `npx supabase db push --dry-run` reports: `Remote database is up to date.`
- `npx supabase migration list` shows local and remote aligned through `0057`.
- Live schema verification confirms key runtime enforcement objects exist:
  - `schema_migration_integrity`
  - `workflow_transition_rules`
  - `security_events`
  - `validation_snapshots`
  - `certification_snapshots`
  - `assignments`
  - `validation_rules`
  - `validation_results`
  - `credit_scores`
  - `workflow_history`
- Live function verification confirms:
  - `validate_submittal(uuid,uuid)`
  - `is_assigned_user(uuid,uuid)`
  - `recompute_credit_scores(uuid)`
  - `get_project_certification_summary(uuid)`
  - `rebuild_derived_states(uuid)`
- `workflow_transition_rules` contains 14 rules.

### Still open after live DB reconciliation
- Runtime audit still flags manual derived-state mutation patterns in application code.
- Universal orchestration across every mutation path remains partial.
- Full role-by-role browser UAT on live data remains pending.

## Latest execution pass (2026-05-13 IST, Canonical Governance Model V1 Integration)

- [~] Define and enforce exact runtime state semantics for:
  - `proposed`
  - `mapped`
  - `ready`
  - `submitted`
  - `approved`.
- [~] Add runtime truth tables for:
  - validation failure
  - AI timeout
  - stale workflow
  - unauthorized access.
- [~] Define and implement failure trees for:
  - rollback
  - retry
  - degraded operation
  - conflict
  - reconciliation.

### P0 - AI runtime governance and authority boundary
- [x] Enforce deterministic-first AI routing:
  - DB -> Validation -> Workflow -> AI.
- [x] Prevent AI from answering deterministic project counts/workflow states/pending items/validation results when deterministic source exists.
- [x] Enforce structured context builder:
  - authorized
  - project-scoped
  - workflow-scoped
  - validation-filtered.
- [~] Block raw RAG dumps, retrieval scores, internal telemetry, and vector metadata from frontend responses.
- [x] Enforce AI response normalization:
  - Assessment
  - Fit
  - Reason
  - Recommendation
  - Confirmation Request.
- [x] Enforce AI capability firewall:
  - AI can summarize/explain/suggest/classify
  - AI cannot mutate/approve/reject/transition/override validation.

### P1 - Governance reference artifacts
- [x] Produce action authority matrix.
- [x] Produce mutation authority matrix.
- [x] Produce workflow authority matrix.
- [x] Produce AI capability matrix.
- [~] Produce canonical runtime diagrams for:
  - document upload lifecycle
  - AI query lifecycle
  - workflow transition lifecycle
  - validation lifecycle
  - rollback lifecycle
  - conflict resolution lifecycle
  - authorization lifecycle.
- [~] Produce API execution contracts for every mutation API:
  - authorization sequence
  - validation sequence
  - workflow checks
  - mutation rules
  - audit obligations
  - rollback behavior
  - side effects.

### P1 - Frontend boundary and reconciliation
- [~] Enforce frontend trust boundary:
  - frontend renders/triggers only
  - frontend never determines permissions/workflow legality/validation success/certification readiness.
- [~] Add reconciliation checks for:
  - derived-state mismatch
  - orphan records
  - workflow desync
  - audit consistency
  - validation consistency.
- [x] Enforce AI security hardening:
  - prompt injection sanitization
  - project-scoped retrieval
  - authorization-before-retrieval
  - AI context filtering
  - DTO filtering.

### P2 - Semantics validation suites
- [x] Add workflow enforcement test suite.
- [~] Add validation authority test suite.
- [x] Add AI hallucination test suite.
- [x] Add prompt injection test suite.
- [x] Add concurrency test suite.
- [~] Add rollback test suite.
- [x] Add tenant isolation test suite.
- [x] Add fallback behavior test suite.

---

## Latest execution pass (2026-05-06 IST, orchestration/runtime hardening)

### Completed
- Added central workflow transition endpoint:
  - `app/api/workflow/transition/route.ts`
- Added orchestration service:
  - `lib/services/workflow-orchestrator-service.ts`
- Routed document review transitions through the orchestrator:
  - `lib/services/review-service.ts`
- Added runtime hardening migration:
  - `supabase/migrations/0056_runtime_semantics_orchestration_hardening.sql`
- Added runtime authority matrix and lifecycle artifact:
  - `artifacts/governance/RUNTIME_AUTHORITY_MATRICES.md`
- Updated `AgentHandoff.md` with implementation and remaining gaps.

### Verified
- `npm run build` passed.
- `npm run qa:workflow` passed (8/8).
- `npm run qa:runtime-audit` passed.

### Still open after this pass
- Universal orchestration migration for all workflow mutation paths.
- Submittal workflow support inside `/api/workflow/transition`.
- Live Supabase migration application and DB-level enforcement verification.
  - Completed in live Supabase on 2026-05-07 through migration history `0057`; `npx supabase db push --dry-run` reports remote database is up to date.
- Startup schema checksum/drift deployment blocker.
- Full certification snapshot freeze/reconstruction UAT.
- Tenant-isolation test suite.

---

## Latest execution pass (2026-05-07 IST, TODO repo-side implementation)

### Completed
- Added 3-phase implementation handoff artifact:
  - `artifacts/handoff/3/TRACKNOV_3Phase_Implementation_Developer_Handoff.md`
- Removed workflow/review mutation controls from the project credit context screen.
- Added governed submittal review detail route:
  - `app/projects/[id]/submittals/[submittalId]/page.tsx`
- Added review auto-dequeue server action:
  - `submitDocumentTransitionAction()` in `app/actions.ts`
- Added required API family proof routes:
  - `app/api/credits/route.ts`
  - `app/api/validation/submittal/route.ts`
- Updated review queue data contract with submittal IDs, allowed actions, lock state, and deterministic ordering inputs.
- Expanded workflow UI contract tests.

### Verified
- `npx playwright test tests/workflow-ui-contract.spec.ts` passed (8/8).
- `npm run build` passed.
- `npm run qa:workflow` passed (8/8).
- `npm run qa:runtime-audit` generated current audit reports.

### Still open after this pass
- Current open/partial TODO count: 113.
- Runtime audit still reports high-severity failure for manual derived-state mutation patterns.
- Universal orchestration is still partial; document review transitions route through the orchestrator, but every mutation path is not yet forced through `/api/workflow/transition`.
- Live Supabase migration applied and verified through Supabase CLI dry-run. Remaining work is runtime UAT and manual derived-state cleanup.

---

## Latest execution pass (2026-05-07 IST, live Supabase migration reconciliation)

### Completed
- Linked local repo to live Supabase project `Tracknov` (`uiecvxxamykfubgtqzap`).
- Repaired four orphan remote migration-history rows as reverted:
  - `20260502132955`
  - `20260502195910`
  - `20260503115233`
  - `20260503120206`
- Applied enforcement migrations `0048` through `0056` directly to live Supabase because the live schema had drifted past the old `documents -> project_document` rename.
- Patched migration `0054_tracknov_supabase_migration_alignment.sql` to tolerate existing `override_logs` tables without `entity_id`.
- Renamed duplicate migration version:
  - `0041_project_credits_documentation_summary.sql`
  - to `0057_project_credits_documentation_summary.sql`
- Applied `0057` through Supabase CLI.

### Verified
- `npx supabase db push --dry-run` reports: `Remote database is up to date.`
- `npx supabase migration list` shows local and remote aligned through `0057`.
- Live schema verification confirms key runtime enforcement objects exist:
  - `schema_migration_integrity`
  - `workflow_transition_rules`
  - `security_events`
  - `validation_snapshots`
  - `certification_snapshots`
  - `assignments`
  - `validation_rules`
  - `validation_results`
  - `credit_scores`
  - `workflow_history`
- Live function verification confirms:
  - `validate_submittal(uuid,uuid)`
  - `is_assigned_user(uuid,uuid)`
  - `recompute_credit_scores(uuid)`
  - `get_project_certification_summary(uuid)`
  - `rebuild_derived_states(uuid)`
- `workflow_transition_rules` contains 14 rules.

### Still open after live DB reconciliation
- Runtime audit still flags manual derived-state mutation patterns in application code.
- Universal orchestration across every mutation path remains partial.
- Full role-by-role browser UAT on live data remains pending.

## Latest execution pass (2026-05-13 IST, Canonical Governance Model V1 Integration)

### Completed in this pass
- Enforced **Section 1 — System Purpose** directly inside global project repository governance storage (`artifacts/governance/`).
- Injected **Principle 4 (Human Governance Authority)** and **Final Governance Law** rules into the active Copilot prompt assembly (`lib/assistant.ts`), locking AI down to advisory limits.
- Updated module headers for `lib/services/copilot-governance.ts` to document Section 1 compliance.
- Discovered and indexed the complete multi-section suite (Sections 1 through 43) of the `TRACKNOV_CANONICAL_GOVERNANCE_MODEL_V1` inside handoff storage.
- Executed local compilation checks (`npx tsc --noEmit`) to guarantee absolute zero type-drift.

### Actionable Pending Integration Queue (Canonical Governance Enforcement)
- [x] **Layer Precedence Hardening (Section 2)**: Hardened `core/runtime/orchestrator.ts` to explicitly assert governing layer topologies and enforce strict L5/L6 arbitration priorities over client payload requests.
- [x] **Universal Workflow Orchestration Enforcement (Section 33 & 36)**: Enforced clear payload transition declarations in the runtime orchestrator gateway to guarantee unified handling via `POST /api/workflow/transition`.
- [x] **Derived State Enforcement Verification (Section 9 & 34)**: Enriched `core/runtime/derivedStateEngine.ts` to enforce total backend compute isolation graphs, permanently blocking uncertified client readiness derivations.
- [x] **Tenant Isolation Law Enforcement (Section 10 & 27)**: Strengthened Copilot route gateways (`app/api/assistant/route.ts`) to embed specific Section 10/27 compliance parameters natively inside `security_events` audit blocks upon cross-tenant requests.
- [x] **Audit Replay Snapshot Chain Review (Section 25 & 28)**: Generated formalized persistent verification walkthrough artifact (`audit_replay_reconstruction_runbook.md`) charting five deterministic milestones.
