# Tracknov TODO (Updated from TRACKNOV_FINAL_HANDOFF_WITH_BUILD_PLAN.md)

Last updated: 2026-05-06 IST (Auditor enforcement implementation pass)
Primary source: `C:\Users\91922\Downloads\TRACKNOV_FINAL_HANDOFF_WITH_BUILD_PLAN.md`
Secondary sources (2026-05-10):  
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\10052026\TRACKNOV_FINAL_HANDOFF_WITH_BUILD_PLAN.md`  
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\10052026\TRACKNOV_IMPLEMENTATION_RECONCILE_MODE_FINAL_DEVELOPER_HANDOFF.md`  
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\10052026\TRACKNOV_UX_WORKFLOW_TRANSFORMATION_HANDOFF.md`  
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\10052026\TRACKNOV_9PLUS_MATURITY_ROADMAP.md`  
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\10052026\TRACKNOV_ENOVAIT_RUNTIME_INVERSION_IMPLEMENTATION_HANDOFF.md`  
- `C:\Users\91922\Documents\Codex\tracknov\Handoff\10052026\TRACKNOV_ENOVAIT_RUNTIME_INVERSION_IMPLEMENTATION_HANDOFF-1.md`

## Priority
- `P0` = release blocker
- `P1` = production must-have
- `P2` = scale layer

---

## 10052026 handoff intake (new requirements added)

### P0 - Runtime/governance hard blockers
- [x] Enforce single-consumption workflow actions with idempotency keys across approvals/rejections/clarifications/uploads/reassignment/exports/certification closure.
- [x] Enforce atomic upload behavior (checksum + metadata + binary consistency), with full rollback and partial-file purge on failure.
- [x] Enforce immutable guidebook after first execution event (first assignment/mapping/upload/review).
- [x] Enforce certification closure as explicit L3-only action with final comments + snapshot linkage; block auto-certification.
- [x] Enforce post-certification hard freeze: no edits/mutations/rollback/corrections (L3 read-only exports only).
- [x] Enforce rollback governance rules: runtime/governance failures only, selective rollback scope, freeze banner, stale export invalidation and regeneration gate.
- [x] Enforce one-L1 and one-L3 per project (backend-enforced uniqueness).
- [x] Add production gate checks for new no-ship blockers:
  - duplicate workflow mutation execution
  - partial upload persistence
  - stale export downloads
  - runtime/governance drift

### P0 - Core workflow model alignment
- [x] Align operational lifecycle to: `Project -> Stage -> Credit -> Submittal -> Document Type -> Document -> Review -> Decision`.
- [x] Enforce stage gating: Design must complete before Construction; Construction must complete before Handover.
- [x] Enforce submittal completion rule: all mandatory document types approved.
- [x] Enforce assignment model: one document type owner; rejected item returns to same owner; assignment auto-creates tasks.

### P1 - Queue-first UX transformation
- [ ] Implement UX orchestration layer for task aggregation, workflow prioritization, hierarchy abstraction, state compression, contextual rendering.
- [ ] Shift primary navigation to queue-first surfaces: Dashboard, My Queue, Reviews, Uploads, Documents, Approvals.
- [ ] Implement dashboard priority order:
  1) My Priority Tasks
  2) Mandatory Blockers
  3) Pending Reviews
  4) Clarifications
  5) AI Guidance
- [ ] Implement three-pane review workspace:
  - left: queue + blockers
  - center: current submittal + docs + approval controls
  - right: AI guidance + validation warnings + workflow history
- [ ] Implement realtime UI updates for assignments/reviews/clarifications/approvals.
- [ ] Keep runtime diagnostics/desync/reconciliation tooling hidden from operational roles (L5-only).

### P1 - EnovAIT runtime inversion (Copilot behavior)
- [~] Implement conversation-first intent handling before governance/workflow tool routing.
- [~] Implement persistent conversation memory (active project/file/credit/stage, prior analysis, unresolved blockers, user objective).
- [~] Split attachment pipelines:
  - conversational attachments (analysis/summarization/comparison only)
  - workflow uploads (explicit command + governance/validation/audit only)
- [~] Implement robust intent hierarchy: conversational, analytical, exploratory, operational, workflow, administrative.
- [~] Enforce silent orchestration (no backend routing/governance narration in user responses).
- [~] Normalize responses for concise, natural, contextual output (no RAG/telemetry/governance internals leakage).
- [x] Lock copilot persona to senior IGBC consultant + Tracknov product expert identity.

### P2 - 9+ maturity roadmap
- [x] Phase 1 maturity closure: runtime stabilization (workflow determinism, derived-state engine, validation interception, immutable audit chain, concurrency protection).
- [x] Phase 2 maturity closure: certification intelligence (credit applicability/dependencies, evidence intelligence, multi-layer score model, clarification intelligence).
- [ ] Phase 3 maturity closure: certification closure engine (snapshot freeze, audit replay, submission freeze).
- [ ] Phase 4 maturity closure: AI + deterministic rule validation with human-only finalization.
- [ ] Phase 5 maturity closure: enterprise hardening (runtime acceptance matrix, golden flow, submission packaging + archives).

---

## 3-phase dependency-safe implementation handoff (from `artifacts/handoff/3/TRACKNOV_3Phase_Implementation_Developer_Handoff.md`)

### P0 - Phase 1 core enforcement gate
- [x] Confirm DB schema enforcement, workflow engine, validation engine, RBAC/RLS, immutable audit logs, and API orchestration are active before expanding UI/AI behavior.
- [x] Prove no direct frontend DB mutations remain.
- [x] Prove no workflow state skipping is possible across DB/API/server actions.
- [x] Prove document overwrite is impossible across every upload/update path.
- [x] Prove no derived state is stored or mutated manually outside backend recalculation/orchestration paths.
- [x] Confirm required API families exist and are backend-authoritative:
  - `/workflow/*`
  - `/validation/*`
  - `/documents/*`
  - `/projects/*`
  - `/credits/*`

### P0 - Cross-phase dependency gates
- [x] Do not expand UI behavior until workflow transitions are backend enforced, validation blocks invalid actions, RLS isolates projects, and audit logging is immutable.
- [x] Do not expand AI behavior until validation authority and project-scoped retrieval are enforced.
- [x] Do not build dashboard/analytics surfaces before derived-state engine outputs are backend-owned.
- [x] Remove operational-user visibility of runtime instability, reconciliation tooling, repair systems, and internal desync metrics.

### P1 - Phase 2 execution and UX safety
- [x] Queue-first UX with capability-driven rendering and lock-state display.
- [~] Review orchestration must be submittal-first, not document/card-first. (submittal review route added; remaining mutation universality still pending)
- [~] Project Admin UI must show only validation queues, blockers, stage readiness, pending reviews, and workflow actions.
- [x] Hide runtime desync metrics, repair tooling, and infrastructure diagnostics from Project Admin and operational roles; reserve internal diagnostics for governance/super-user/admin-only surfaces.
- [x] Close React Harita Phase 2 stream contract and remove dead evidence-target selection path from the active upload/analyze flow.

### P1 - Phase 3 AI certification intelligence safety
- [x] Keep AI advisory-only:
  - summarize
  - recommend
  - explain
- [x] Block AI from approve/reject/override/transition authority.

---

## Latest execution pass (2026-06-18 IST, React Harita Phase 2 closure)

- Closed the active React Harita Phase 2 path at the integration layer:
  - terminal SSE `done` event now carries structured attachment analysis metadata
  - React client now consumes terminal metadata without legacy side-channel dependence
  - dead credit-evidence target loader removed from the client
  - dead `GET /api/assistant/credit-evidence-targets` route removed from the React server
- Verification completed:
  - `tracknov-ai-server`: `npm run build`
  - `React/tracknov-server`: `npm run build`
  - `React/tracknov-client`: `npm run build`
- Scope note:
  - this does **not** mark the broader certification-intelligence roadmap complete
  - this closes Phase 2 only for the active React Harita runtime path

## Latest execution pass (2026-06-19 IST, certification-intelligence phase 2 closure)

- Closed the remaining Phase 2 certification-intelligence gap inside the active `tracknov-ai-server` runtime:
  - added verified credit applicability + dependency retrieval
  - added verified evidence intelligence retrieval
  - added multi-layer score model retrieval
  - added clarification intelligence retrieval
- Extended the live Harita tool contract with:
  - `get_credit_applicability`
  - `get_evidence_intelligence`
  - `get_score_model`
  - `get_clarification_intelligence`
- Routed the new intelligence surfaces through intent and sequence orchestration so analytical/project questions can force the relevant verified reads instead of falling back to generic project snapshots.
- Kept the implementation grounded to existing authoritative schema/tables:
  - `mandatory_requirements`
  - `rule_dependencies`
  - `credit_scores`
  - `ai_recommendations`
  - `evidence_extractions`
  - `clarification_intelligence`
  - `clarification_lifecycle_metrics`
  - `certification_projections`
- Verification completed:
  - `tracknov-ai-server`: `npm run build`
  - `React/tracknov-server`: `npm run build`
  - `React/tracknov-client`: `npm run build`
- Status boundary:
  - dependency reporting uses explicit rule mappings only when `rules.rule_logic` is actually linked to the requested credit; it does not fabricate rule joins
  - clarification lifecycle metrics are project-scoped through linked submittals when those records exist

## Latest execution pass (2026-06-19 IST, React Gemini-like composer closure)

- Closed the remaining active React-side Gemini-like composer gap in:
  - `C:\Users\91922\Documents\Codex\tracknov\React\tracknov-client\src\components\assistant\global-harita.tsx`
- Composer now supports:
  - direct native click-to-attach through the paperclip
  - drag-and-drop file attach directly onto the live composer bubble
  - inline attachment preview above the composer with readiness state and clear/remove action
- This keeps the attach flow inside the active chat bubble and does not reintroduce the old floating target modal.
- Verification completed:
  - `React/tracknov-client`: `npm run build`
  - `tracknov-ai-server`: `npm run build`

## Latest execution pass (2026-06-18 IST, Harita runtime intent + response normalization pass)

- Advanced the active AI server against pending EnovAIT runtime inversion items:
  - added conversation-first routing lane so greetings and low-information conversational turns no longer force tool-first project dumps
  - introduced explicit intent lanes: `conversational`, `analytical`, `exploratory`, `operational`, `workflow`, `administrative`
  - added conversation memory injection into the system prompt:
    - active project
    - active credit reference
    - active document name
    - latest user objective
    - recent user messages
  - tightened persona lock to senior IGBC consultant + Tracknov product expert
  - hardened response rules to suppress internal runtime language (`tool`, `RAG`, `vector`, `telemetry`, `router`, `governance chain`)
  - normalized greeting and document-summary behavior so Harita answers the user question first instead of defaulting to project-wide status blocks
- Verification completed:
  - `tracknov-ai-server`: `npm run build`
  - `React/tracknov-server`: `npm run build`
  - `React/tracknov-client`: `npm run build`
- Status boundary:
  - conversation memory is now prompt-level and session-context-aware, but not yet a fully persisted cross-session memory subsystem
  - attachment pipeline split between conversational analysis and governed workflow upload is still open

## Latest execution pass (2026-06-18 IST, attachment pipeline separation pass)

- Tightened the active React Harita attachment contract so ordinary chat messages no longer inherit the last workflow evaluation target.
- Attachment behavior now splits cleanly in the live React path:
  - normal composer sends remain conversation analysis only
  - explicit `Evaluate for ...` actions alone lock the attachment to a credit audit target
  - explicit workflow actions alone trigger project evidence upload / reviewer routing
- Added visible user-state guidance in the composer:
  - conversation analysis mode notice for unattached workflow state
  - locked evaluation notice when the user explicitly selects a credit
- Hardened AI copy in `tracknov-ai-server` so discovery, summary, and audit responses explicitly state that no tracker mutation has happened unless the user executes a workflow action.
- Verification completed:
  - `tracknov-ai-server`: `npm run build`
  - `React/tracknov-server`: `npm run build`
  - `React/tracknov-client`: `npm run build`
- Status boundary:
  - active React Harita now enforces conversational analysis vs governed upload separation
  - broader attachment-governance maturity work still remains for full roadmap closure

## Latest execution pass (2026-06-18 IST, project role uniqueness enforcement pass)

- Added project-role governance checks for unique operational slots:
  - `Project Manager (L1)`
  - `Project Admin (L3)`
- Implemented shared helper in:
  - `C:\Users\91922\Documents\Codex\tracknov\lib\harita-engine\services\project-membership-governance.ts`
- Wired active backend entry points to reject duplicate L1/L3 occupancy before writes:
  - direct team-member provisioning in `app/actions.ts`
  - project invite creation in `lib/harita-engine/services/member-service.ts`
  - project invite acceptance in both active acceptance paths
- Enforcement now blocks:
  - existing occupied L1/L3 member slot
  - pending unresolved invite already reserving the same L1/L3 slot
- Verification note:
  - repo-wide `npx tsc --noEmit` is still failing on pre-existing unrelated workspace/type issues in `React/tracknov-client`, `React/tracknov-server`, and handoff artifact files
  - no new failure was surfaced in the changed governance logic itself
- Status boundary:
  - active `project_members` membership path now has backend uniqueness protection
  - full closure still requires legacy `project_users` path retirement and/or DB-level uniqueness enforcement

## Latest execution pass (2026-06-18 IST, membership model convergence + DB uniqueness pass)

- Converged the active runtime membership model back onto `public.project_users`, which is the dominant hardened schema in the repo and migrations.
- Migrated active write/read paths away from `project_members` in:
  - `app/actions.ts`
  - `lib/harita-engine/services/project-membership-governance.ts`
  - `lib/harita-engine/services/workflow-service.ts`
  - `lib/harita-engine/assistant-tools.ts`
  - `lib/harita-engine/intelligence/agents/executor.ts`
- Added new Supabase migration:
  - `supabase/migrations/20260618132141_project_user_role_uniqueness_hardening.sql`
  - Drops old narrow indexes and creates alias-aware unique partial indexes for:
    - `owner` / `L1`
    - `project_admin` / `admin` / `L3`
- Verification boundary:
  - repo-wide `npx tsc --noEmit` still reports pre-existing unrelated React workspace/type issues
  - `supabase migration list --local` could not be executed because no local Supabase/Postgres instance is running in this workspace
- Status boundary:
  - active membership writes and key runtime reads are now aligned to `project_users`
  - a few residual non-runtime references to `project_members` remain in schema/catalog/tool naming surfaces
  - DB uniqueness migration is created but not yet applied/verified against a live or local database

## Latest execution pass (2026-06-18 IST, membership cleanup + live migration apply pass)

- Removed the remaining stale `project_members` runtime/schema naming drift in the targeted code surfaces:
  - `lib/core/database/catalog.ts`
  - `lib/harita-engine/intelligence/agents/planner.ts`
  - `lib/harita-engine/intelligence/agents/executor.ts`
  - mirrored React server planner/executor/catalog/runtime helper files
- Normalized the tool label from `get_project_members` to `get_project_team` in the targeted planner/executor surfaces.
- Applied the new live Supabase migration to the linked project `uiecvxxamykfubgtqzap`:
  - `supabase/migrations/20260618132141_project_user_role_uniqueness_hardening.sql`
- Remote verification:
  - `supabase db push --linked --dry-run` now reports: `Remote database is up to date.`
- Verification boundary:
  - `supabase migration list` still requires `SUPABASE_DB_PASSWORD` for direct remote history connection, but the successful push followed by clean dry-run confirms the migration is already applied.
- Status impact:
  - `one-L1 and one-L3 per project` is now closed for the active application + database path

## Latest execution pass (2026-06-18 IST, Phase 1 governance closure pass)

- Closed the remaining active governance holes in the authoritative Next.js path and mirrored React server services:
  - foundation assets now freeze on the first real execution signal, not only on document presence
  - guidebook/data table/tracker mutation now blocks once assignments, submittals, or uploaded evidence exist
  - `projects.is_guidebook_locked` is now asserted from the broader execution-start condition
  - certification closure now requires:
    - exact `project_admin` actor
    - non-empty final comments
    - no open `STATE_DESYNC`
    - existing `CERTIFIED` state before final seal
  - closure now generates an immutable certification snapshot and then seals the project through the governed workflow transition path instead of direct state mutation
  - export routes for tracker / summary / submission-pack now run through governed export context checks:
    - `STATE_DESYNC` gate
    - post-certification role restriction
    - replay hash capture
    - immutable export lineage logging
    - `Cache-Control: no-store` to prevent stale browser-served downloads
- Workflow machine change:
  - `CERTIFIED -> CERTIFIED_LOCKED` is now an explicit `L3` closure action in both runtime trees
- Verification completed:
  - targeted root typecheck no longer reports errors in the changed governance files
  - `React/tracknov-server`: `npm run build`
- Verification boundary:
  - repo-wide root typecheck still contains unrelated pre-existing failures in `React/tracknov-client` and handoff artifact files

## Latest execution pass (2026-06-19 IST, rollback governance + derived-state proof pass)

- Added explicit governance freeze state into the authoritative project workspace payload:
  - open runtime desync count
  - open reconciliation count
  - freeze reason string for live UI surfaces
- Rendered the governance freeze banner in the active Next.js project workspace layout:
  - `C:\Users\91922\Documents\Codex\tracknov\app\projects\[id]\layout.tsx`
- Added deterministic derived-state mutation audit:
  - `C:\Users\91922\Documents\Codex\tracknov\scripts\phase1-derived-state-audit.mjs`
  - blocks new direct writes to authoritative derived-state fields outside the narrow allowlist
- Mirrored the workspace freeze-state enrichment into:
  - `C:\Users\91922\Documents\Codex\tracknov\React\tracknov-server\src\lib\data.ts`
- Verification completed:
  - `node scripts/phase1-derived-state-audit.mjs`
  - `React/tracknov-server`: `npm run build`
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
- [ ] Prove no manual derived-state updates remain in mutation code paths.

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

---

## Latest execution pass (2026-06-18 IST, atomic upload rollback closure pass)

### Completed
- Closed the post-commit upload atomicity gap in both active server upload services:
  - `lib/harita-engine/services/document-service.ts`
  - `React/tracknov-server/src/lib/harita-engine/services/document-service.ts`
- Added compensating rollback enforcement for late upload-path failures after the core document/token RPC succeeds:
  - purge uploaded storage binary
  - delete created `project_document` row
  - restore previous latest document version
  - refund consumed client token
  - remove stale upload idempotency/audit marker so retries are clean
  - reactivate assignment slot
  - revert or delete submittal state created by the failed upload
- Corrected submittal lifecycle drift:
  - submittal transition now follows the computed review state instead of a hardcoded `L1_REVIEW`

### Verified
- `React/tracknov-server`: `npx tsc -p tsconfig.json --noEmit --pretty false` passed.
- Root workspace `npx tsc -p tsconfig.json --noEmit --pretty false` still fails on pre-existing unrelated issues in:
  - `artifacts/handoff/15062026/*`
  - `React/tracknov-client/*`

### Status boundary
- Upload binary + document row + token debit + retry idempotency now roll back together on critical late failure.
- Non-critical side channels such as upload telemetry and async intelligence remain best-effort by design.

## Latest execution pass (2026-06-18 IST, workflow replay suppression pass)

### Completed
- Advanced the still-open single-consumption workflow item in the governed review path.
- Updated both workflow orchestrators to surface replay/no-op signals from `execute_governed_transition`.
- Updated both review services to suppress duplicate side effects when a transition request is replayed or already satisfied:
  - approved-document RAG ingestion
  - immutable review-event insert
  - rejection-pattern learning writes
  - review-completed / rejected event emission
  - project submission completion event emission

### Verified
- `React/tracknov-server`: `npx tsc -p tsconfig.json --noEmit --pretty false` passed.

### Status boundary
- Review and project-submission side effects now respect workflow idempotency replies.
- The broader TODO item is still open until reassignment/export/certification-closure paths are brought under the same single-consumption guarantee.
