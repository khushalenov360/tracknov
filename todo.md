# Tracknov TODO (Pending Items Only)

Last updated: 2026-04-29 IST  
Baseline: `tracknov-project-plan.md` (including merged updated scope overlay)

## Tracknov V2 TODO (Mapped to `Ai developerhandoff.md`)

### P0 - Foundation-critical (must complete first)

- [x] V2.0 Workflow state model alignment:
  align canonical workflow with handoff states (`uploaded -> owner_review -> admin_review -> approved/rejected`) while preserving existing workflow engine guarantees.
- [x] V2.1 RBAC hard enforcement middleware:
  enforce action-level guards for `L0`, `L1`, `L3`, `L5` on every API/server action path.
- [x] V2.2 Token ledger strictness:
  ensure token debit occurs only after successful upload commit and ledger entry is immutable/auditable.
- [x] V2.3 Review decoupling completion:
  wire all review actions to dedicated review records (`reviews`/`document_reviews`) with multi-cycle tracking.
- [x] V2.4 API-level transition-only updates:
  block any direct status mutation paths that bypass workflow transition service.

### P1 - Core architecture and scale

- [x] V2.5 Service-layer completion:
  finish extraction from `app/actions.ts` into:
  - `document_service`
  - `review_service`
  - `billing_service`
  - `project_service`
- [x] V2.6 Event-driven backbone:
  implement event bus foundation and async consumers for:
  - `DOCUMENT_UPLOADED`
  - `REVIEW_COMPLETED`
  - `DOCUMENT_REJECTED`
  - `TOKEN_DEDUCTED`
- [x] V2.7 Event consumers:
  connect billing, notification, and AI validator consumers to event stream.
- [x] V2.8 Database completeness pass:
  verify/close schema coverage for:
  - `clients`
  - `projects`
  - `credits`
  - `project_credits`
  - `documents`
  - `reviews`
  - `users`
  - `project_users`
  - `wallets`
  - `token_transactions`
  - `embeddings`
  - `rejection_patterns`
  - `activity_logs`
- [x] V2.9 API surface completion:
  finalize role-secured APIs for:
  - document upload/list/versioning
  - review approve/reject/remarks
  - wallet balance + transaction history
  - AI suggestions + risk score

### P2 - AI intelligence layer

- [ ] V2.10 RAG baseline:
  ingest approved docs + IGBC guidance into embeddings and retrieval pipeline.
- [ ] V2.11 Pre-upload validator:
  file type, naming, and credit relevance checks before acceptance.
- [ ] V2.12 Rejection intelligence:
  pattern capture and corrective suggestion pipeline per credit/document type.
- [ ] V2.13 Risk engine:
  project risk score using missing docs, rejection frequency, and delays.

### P3 - Frontend role UX and performance

- [ ] V2.14 Role dashboards completion:
  ensure clear role-mode surfaces:
  - L0 upload workspace
  - L1 review queue
  - L2 portfolio summary
  - L3 approval console
- [ ] V2.15 Persistent AI copilot:
  one shared panel across tabs with context-aware suggestions and risk alerts.
- [ ] V2.16 Non-functional targets:
  - async heavy operations
  - target API latency <300ms for core endpoints
  - project-level data isolation checks
  - immutable activity logging checks

### V2 Delivery checklist (from AI handoff)

- [ ] Workflow state machine implemented
- [ ] Token ledger active and tested
- [ ] AI validator working
- [ ] RAG system integrated
- [ ] Risk engine functional
- [ ] RBAC enforced
- [ ] Event system operational
- [ ] APIs documented

## UX/UI V2 TODO (Mapped to `UX_UI_developer_handoff.md`)

### UX P0 - Product definition and navigation lock

- [ ] UX0.1 Scope lock implementation:
  remove/avoid UI language that implies ESG/carbon/tokenization product scope beyond certification workflow.
- [ ] UX0.2 Global navigation lock:
  ensure top nav contains and consistently routes:
  - Dashboard
  - Projects
  - Credits
  - Documents
  - Tasks
- [ ] UX0.3 Workflow-first navigation audit:
  remove duplicate navigation paths and dead-end routes.

### UX P1 - Primary screen coverage

- [ ] UX1.1 Dashboard compliance:
  show project list, completion %, pending credits, and risk flags with quick drilldowns.
- [ ] UX1.2 Create Project screen:
  include project name, rating system, location, and team assignment fields.
- [ ] UX1.3 Project Overview screen:
  include progress %, credit summary, and activity log panel.
- [ ] UX1.4 Credits List screen:
  include filters, status, assignee, and deadline columns.
- [ ] UX1.5 Credit Detail core workflow:
  support upload, status update, assignment, comments, and submit actions with required evidence context.
- [ ] UX1.6 Documents screen:
  ensure linked project, linked credit, version, and status are visible and filterable.
- [ ] UX1.7 Tasks screen:
  implement task CRUD with linked credit, assignee, due date.
- [ ] UX1.8 Submission/Review screen:
  implement submit/resubmit, reviewer comments, and timestamped trail.
- [ ] UX1.9 User Management screen:
  support add/edit users and role assignment with clear permissions visibility.

### UX P2 - Role rendering and state-driven behavior

- [ ] UX2.1 Consultant role mode:
  dense execution UI (tables/filters) with full workflow controls where authorized.
- [ ] UX2.2 Client role mode:
  read-only visual dashboard mode; hide/disable credit/document edit actions.
- [ ] UX2.3 State-driven controls:
  - Approved -> lock all editing controls
  - Submitted -> lock edits except comments
  - Review Failed -> reopen allowed edits
- [ ] UX2.4 Credit lifecycle UX mapping:
  reflect states:
  - Not Started
  - In Progress
  - Ready for Submission
  - Submitted
  - Review Failed
  - Approved
  with strict transition affordances.

### UX P3 - Flow and component architecture refactor

- [ ] UX3.1 Primary journey validation:
  - Dashboard -> Create Project -> Project Overview
  - Project -> Credits List -> Credit Detail
  - Credit Detail -> Upload Docs -> Mark Ready -> Submit
  - Dashboard Risk -> Credit drilldown
- [ ] UX3.2 Component architecture cleanup:
  refactor toward:
  - `components/project/`
  - `components/credit/`
  - `components/document/`
  - `components/task/`
  - `components/shared/`
- [ ] UX3.3 Non-negotiables QA pass:
  - every screen has a clear primary action
  - no mixed-role UI on same view
  - no feature without workflow mapping
  - no dead-end screens

## IGBC Engine TODO (Mapped to `IGBC_Developer_Handoff.md`)

### IGBC P0 - Certification engine foundation

- [ ] IGBC0.1 Credit-stage relational model:
  implement stage-aware schema:
  - `rating_systems`
  - `credits`
  - `credit_stages`
  - `submittals`
  - `documents`
  - `document_versions`
- [ ] IGBC0.2 Strict stage mapping:
  ensure all submittals are bound to a single `credit_stage_id` and cannot float across stages.
- [ ] IGBC0.3 Dual lifecycle readiness:
  add `DESIGN` and `CONSTRUCTION` stage lifecycle support in backend services.

### IGBC P1 - Workflow and control engines

- [ ] IGBC1.1 Multi-level workflow engine:
  enforce transitions at:
  - submittal level
  - derived credit level
  - derived project level
- [ ] IGBC1.2 Stage gate rules:
  block construction lifecycle start unless design approval gate is met.
- [ ] IGBC1.3 Override engine:
  admin-controlled credit-stage overrides with reason-required logs (`override_logs`).
- [ ] IGBC1.4 Immutable versioning:
  prevent document overwrite; all updates must create a new version row.
- [ ] IGBC1.5 Inheritance engine:
  design-to-construction reference carry-forward using:
  - `source_stage`
  - `source_version_id`
  - `inherited_flag`

### IGBC P2 - Scoring and submission engines

- [ ] IGBC2.1 Rule-based scoring:
  mandatory credit enforcement + points aggregation + threshold outcomes.
- [ ] IGBC2.2 Stage score outputs:
  design provisional score + construction final score.
- [ ] IGBC2.3 Submission pack generator:
  one-click stage-wise pack output:
  - credit-wise bundle
  - narratives
  - calculations
  - latest approved supporting documents

### IGBC P3 - Audit and compliance reporting

- [ ] IGBC3.1 Audit engine:
  log state changes, uploads, overrides in `audit_logs`.
- [ ] IGBC3.2 Audit export:
  generate PDF + Excel exports including:
  - credit states
  - version history
  - override logs
  - timeline
- [ ] IGBC3.3 Compliance hard validations:
  - mandatory credits must be approved
  - submission blocked if incomplete
  - override must log reason
  - no certification without construction validation

### IGBC P4 - RBAC and governance enforcement

- [ ] IGBC4.1 Hierarchy enforcement:
  - L5 full control (override + audit)
  - L3 workflow owner
  - L1 internal approval
  - L0 upload only
  - L2 read-only
- [ ] IGBC4.2 API-only enforcement:
  no UI-only protections; reject unauthorized actions server-side.
- [ ] IGBC4.3 Hard-rule tests:
  automated tests for:
  - no stage duplication
  - no state skipping
  - no overwrite
  - no incomplete submission

## SaaS Sales Enablement TODO (Mapped to `SAASsales_Developer_Handoff.md`)

### Sales P1 (Immediate): ROI Engine + Executive Dashboard

- [ ] SALES1.1 ROI intelligence service:
  build backend calculation service for:
  - time saved
  - cost saved
  - rejection reduction
  from configurable input constants.
- [ ] SALES1.2 ROI config model:
  add admin-editable assumptions (review time, hourly rate, rework reduction) with safe defaults.
- [ ] SALES1.3 ROI caching:
  cache aggregate ROI results for dashboard response speed.
- [ ] SALES1.4 Executive sales dashboard API:
  build aggregated API for portfolio snapshot, risk indicators, efficiency metrics, and ROI widget.
- [ ] SALES1.5 Executive dashboard UI:
  card-based CXO view with RAG signals and low-click clarity.
- [ ] SALES1.6 Performance targets (phase 1):
  verify:
  - dashboard load <2 sec target
  - ROI calculation <1 sec target

### Sales P2: Demo Mode (Guided Walkthrough)

- [ ] SALES2.1 Demo-mode feature flag:
  introduce `demo_mode` gate and sandbox isolation.
- [ ] SALES2.2 Preloaded demo dataset:
  seeded demo projects/credits/docs/review outcomes isolated from production data.
- [ ] SALES2.3 Guided walkthrough overlay:
  step prompts for upload -> review -> dashboard insight.
- [ ] SALES2.4 Demo reset mechanism:
  one-click resettable demo state for repeated sales sessions.
- [ ] SALES2.5 Demo security checks:
  enforce sandboxed data boundaries and role-safe visibility.

### Sales P3: Case Study Generator

- [ ] SALES3.1 Case-study metrics service:
  derive completion delta, rejection reduction, and time-saved summaries per client/project.
- [ ] SALES3.2 Template-driven report generation:
  backend templating for standardized case study narratives.
- [ ] SALES3.3 Export outputs:
  PDF generation + shareable link support.
- [ ] SALES3.4 Performance target (phase 3):
  PDF generation <5 sec target.

### Sales governance and integration checks

- [ ] SALES4.1 Integration validation:
  confirm sales layer consumes existing workflow engine, token system, and audit logs.
- [ ] SALES4.2 Data isolation validation:
  ensure ROI and case-study views cannot expose other clients' data.
- [ ] SALES4.3 Scope guardrails:
  keep out-of-scope exclusions enforced:
  - no CRM
  - no marketing automation
  - no external lead generation features

## Client Layer TODO (Mapped to `Client_Developer_Handoff.md`)

### Client P1 - Executive visibility and trust

- [ ] CLIENT1.1 Executive dashboard panel:
  show:
  - overall completion %
  - target rating
  - active projects
  - projects at risk
  - token balance
  with sub-30-second readability.
- [ ] CLIENT1.2 Portfolio overview:
  show total/completed/in-progress/delayed projects in one view.
- [ ] CLIENT1.3 Token wallet transparency:
  show loaded/used/remaining/weekly usage with clear provenance from ledger.
- [ ] CLIENT1.4 Efficiency metrics panel:
  show rejection rate, avg tokens/project, first-pass approval rate.

### Client P2 - Risk, forecasting, and drilldowns

- [ ] CLIENT2.1 Project risk engine:
  compute RAG risk from pending uploads, rejections, inactivity, and token balance.
- [ ] CLIENT2.2 Forecasting outputs:
  estimated completion and projected rating at project + portfolio level.
- [ ] CLIENT2.3 Restricted drilldown mode:
  allow only project-level completion/pending/rejections for client role.
- [ ] CLIENT2.4 Enforce document-level restriction:
  block client access to document-level internal review screens/details.

### Client P3 - Reports and alerts

- [ ] CLIENT3.1 Client report exports:
  downloadable PDF summary including status, risk, and token intelligence.
- [ ] CLIENT3.2 Client alert rules:
  actionable-only alerts for:
  - project risk
  - low tokens
  - milestone transitions
- [ ] CLIENT3.3 Client alert delivery:
  in-app + extensible channel support without notification spam.

### Client P4 - API and backend coverage

- [ ] CLIENT4.1 Client API surface:
  implement/verify:
  - `/client/dashboard`
  - `/client/projects`
  - `/client/tokens`
  - `/client/metrics`
  - `/client/reports`
  - `/client/alerts`
- [ ] CLIENT4.2 Data model readiness:
  ensure required tables/derived views:
  - `clients`
  - `projects`
  - `tokens_wallet`
  - `token_transactions`
  - `project_metrics`
- [ ] CLIENT4.3 Role-scoped data isolation:
  ensure client APIs cannot return other-client records.

### Client P5 - UX/performance/testing gates

- [ ] CLIENT5.1 UX guideline compliance:
  - max 1-2 clicks to key answers
  - no IGBC jargon on client views
  - RAG color coding across all client status cards
  - mobile responsive behavior
- [ ] CLIENT5.2 Performance gate:
  client dashboard target load <2 sec.
- [ ] CLIENT5.3 Validation suite:
  test:
  - dashboard accuracy
  - token consistency
  - risk correctness
  - load <2 sec
  - no-training usability

## Role and Engine Handoffs TODO (Mapped to newly added handoff files)

### Role-specific tracks

- [ ] ROLE-MEP0 (Mapped to `MEPCON_Developer_Handoff.md`):
  implement MEP consultant focused workspace, credit scoping, upload validation guidance, and actionable rejection loop.
- [ ] ROLE-ARCH0 (Mapped to `Architect_Developer_Handoff.md`):
  implement architect multi-document-per-credit mapping, pre-review edit/move, and structured checklist completion.
- [ ] ROLE-CONTR0 (Mapped to `Contractor_Developer_Handoff.md`):
  simplify contractor upload flow (plain-language, low-friction, confirmation-first) with role-safe restrictions.
- [ ] ROLE-OWNER0 (Mapped to `ProjectOwner_Developer_Handoff.md`):
  complete owner review cockpit, bulk actions, escalation signals, and vendor accountability views.
- [ ] ROLE-PADMIN0 (Mapped to `ProjectAdmin_Developer_Handoff.md`):
  complete high-throughput validation queue, rejection template workflows, submission readiness controls.
- [ ] ROLE-CLIENT0 (Mapped to `Client_Developer_Handoff_Refined.md`):
  refine executive/client views for 30-second decision clarity and strict read-only drilldowns.

### Engine-specific tracks

- [ ] ENG-WF0 (Mapped to `Workflow_Engine_Developer_Handoff.md`):
  finalize strict workflow engine compliance with no bypass transitions and derived credit/project rollups.
- [ ] ENG-CRED0 (Mapped to `Credits_Engine_Developer_Handoff.md`):
  complete credit engine rules, lifecycle, assignment constraints, and scoring dependencies.
- [ ] ENG-DOC0 (Mapped to `Documents_Engine_Developer_Handoff.md`):
  complete document engine for version immutability, lineage, stage-safe mappings, and lifecycle constraints.
- [ ] ENG-TOKEN0 (Mapped to `TokenEngine_Developer_Handoff.md`):
  complete token engine reconciliation guarantees, debit/refund correctness, and balance transparency.
- [ ] ENG-USER0 (Mapped to `users_developerhandoff.md`):
  complete user engine onboarding, role assignment hierarchy, access isolation, and lifecycle management.

### Consolidation and conflict-resolution pass

- [ ] HANDOFF-SYNC0:
  reconcile overlapping requirements across all role/module handoff files into one conflict-free execution matrix with explicit ownership.

## P0 Backend Workflow (W1) - In Progress

- [x] DB enum migration added: `workflow_state`
  - values: `DRAFT`, `READY`, `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION`, `RESUBMITTED`, `APPROVED`, `REJECTED`
- [x] DB table migration added: `document_states`
  - fields: `document_id`, `state`, `previous_state`, `transition_by`, `updated_at`
- [x] Service added: `transitionDocumentState(document_id, new_state, user_id)`
  - file: `lib/services/document-state-service.ts`
- [x] Transition validation implemented:
  - only allowed transitions
  - no skipped states
  - explicit error for invalid transitions
- [x] Business-rule validation implemented:
  - `DRAFT -> READY`: required document types must exist for target credit
  - `READY -> SUBMITTED`: manual trigger required
  - `SUBMITTED -> UNDER_REVIEW`: reviewer assignment required
  - `CLARIFICATION -> RESUBMITTED`: updated evidence flag required
- [x] Server action added: `transitionDocumentStateAction(...)`
  - file: `app/actions.ts`
- [x] Logging implemented:
  - every transition inserted into `document_states`
  - transition also written to `document_activity_logs`
- [x] Edit enforcement started:
  - metadata edits blocked in `SUBMITTED` / `UNDER_REVIEW`
  - metadata edits allowed in `DRAFT` / `CLARIFICATION`
- [x] Remaining for W1:
  - route existing review actions (`setDocumentStatusAction`, bulk review, resubmit) through workflow-state engine end-to-end.

## P1 - BUILD & VERIFY (STRICT ORDER)

### 1. Workflow Engine

- [x] Create `workflow_state` enum.
- [x] Create `document_states` table (with `previous_state`, `transition_by`).
- [x] Implement API/service: `transitionDocumentState()`.
- [x] Enforce allowed transitions (no skips).
- [x] Enforce edit locking by state.
- [x] Log every transition (activity + state table).
- [x] Add role guardrails:
  - only L3 can `APPROVE` / `REJECT`
  - L0 cannot move beyond `READY`
  - L1 cannot override decisions
- [x] Remove remaining legacy bypass paths in bulk review/resubmit flows so all review transitions use workflow-state API only.

### 2. Project -> Credit Mapping

- [x] Ensure `credits` (master) + `project_credits` (instance) exist.
- [x] Auto-create `project_credits` on project creation.
- [x] Bind credits to project in UI.
- [x] Display credit status correctly.
- [x] Ensure no missing credits per project.

### 3. Document -> Credit Linkage

- [x] Enforce upload requires:
  - `project_id`
  - `project_credit_id`
  - `document_type`
- [x] Store file (Supabase Storage) + metadata (DB).
- [x] Implement versioning:
  - increment `version`
  - set `is_latest`
  - link `parent_document_id`
- [x] Validate required docs per credit.

### 4. Review Workflow

- [x] Implement review queue (`SUBMITTED` / `UNDER_REVIEW`).
- [x] Approve action -> `APPROVED`.
- [x] Reject action -> `CLARIFICATION` / `REJECTED` (remarks mandatory).
- [x] Implement clarification -> resubmission loop.
- [x] Restrict transitions by role.

### 5. RBAC Enforcement

- [x] Enforce roles in API (L0-L5).
- [x] Enforce UI restrictions (hide/disable actions).
- [x] Validate:
  - L0 cannot submit
  - L1 cannot override
  - L2 read-only
  - L3 controls workflow
- [x] Block unauthorized API calls.

## P2 - STABILITY LAYER

### 6. Dashboard

- [ ] Compute counts (all states).
- [ ] Calculate progress %.
- [ ] Implement risk flags (basic rules).
- [ ] Build API: dashboard aggregation.

### 7. Export System

- [ ] Include only `APPROVED` + `is_latest` documents.
- [ ] XLSX generation.
- [ ] PDF summary generation.
- [ ] ZIP structured export.
- [ ] Block export if mandatory credits not approved.

### 8. Audit Logs

- [x] Create `activity_logs` table.
- [x] Log all actions:
  - upload
  - review
  - transitions
  - export
- [ ] Build timeline UI.

## P0 UX Epics (Client Experience Vision, highest priority)

- [x] Epic UX0.1 - One-screen executive clarity dashboard:
  show portfolio completion %, risk (RAG), pending documents, rejection count, and estimated certification outcome without deep navigation.
- [x] Epic UX0.2 - "What is stuck right now" command panel:
  one-click list of delayed credits across projects with owner, responsible role, exact missing document, and aging days.
- [x] Epic UX0.3 - Credit-level checklist clarity:
  each credit must present `pending -> responsible -> exact required evidence` with unambiguous states (`Not started`, `Uploaded`, `Approved`, `Rejected`).
- [x] Epic UX0.4 - Rejection intelligence workspace:
  cross-project rejection pattern analysis, common-reason suggestions, and fix guidance with successful-example references.
- [x] Epic UX0.5 - Guided next-best-action workflow:
  Copilot and dashboard should drive concrete next tasks (role-specific action prompts), not generic Q&A only.
- [x] Epic UX0.6 - Upload experience hardening (mobile-first):
  large touch controls, drag-drop and simple file attach flow, auto-tag confirmation (credit + doc type), and persistent success confirmations.
- [x] Epic UX0.7 - Timeline intelligence:
  predict completion date by current velocity and surface delay-risk reasons with urgency indicators.
- [x] Epic UX0.8 - Token transparency panel:
  per-project token usage, burn rate, cost progression, and predicted exhaustion shown in plain business language.
- [x] Epic UX0.9 - Visual audit timeline:
  human-readable timeline of who did what and when (not raw logs), with filters by project/credit/user/action.
- [x] Epic UX0.10 - Project comparison board:
  compare locations on efficiency, delay, rejection rate, and readiness to enable management decisions.
- [x] Epic UX0.11 - Vendor intelligence baseline:
  vendor submission performance profile (success %, rejection frequency, delayed-resubmission rate) for future ranking and guidance.
- [x] Epic UX0.12 - UX quality and speed gates:
  enforce page-load targets (<2s where feasible), stable upload flow, crash-free key paths, and mobile-first readability.

## Priority 0 - Persona-critical UX and workflow (new, highest priority)

- [x] L0 role-focused workspace views:
  show only assigned credits for `mep`, `architect`, `contractor` (no full 47-credit noise by default).
- [x] L0 mobile-first upload path:
  3-step flow (credit -> doc type -> file) with strong touch UX and clear success state.
- [x] Pre-submit confirmation safety:
  5-second cancel window before upload starts.
- [x] Prevent accidental token burn:
  no token deduction when upload fails or credit/doc-type mapping is invalid.
- [x] Doc requirement clarity before upload:
  show exact "required evidence" text and accepted file types for selected credit/doc type.
- [x] Rejection quality:
  enforce specific rejection reason templates and free-text guidance (not generic "non-compliant").
- [x] L0 self-service correction:
  allow move/delete/edit before review lock without token penalty for mapping mistakes.
- [x] L1 Project Owner review cockpit:
  document preview + approve/send back + mandatory reason + queue summary.
- [x] L1 dedicated review queue baseline:
  new `review-queue` page with clean rows and approve/send-back actions.
- [x] L1 bulk action baseline:
  multi-select and bulk approve/send-back with shared rejection remark.
- [x] L1 one-screen portfolio baseline:
  owner dashboard table with progress, pending uploads, pending review, consultant queue, risk tag.
- [x] L1 rejection template baseline:
  structured reject reason types in queue (`missing_data`, `wrong_document`, `poor_quality`, `outdated_document`, `wrong_credit_mapping`).
- [x] L1 inline preview-first review:
  queue rows render embedded preview with no project-page navigation required.
- [x] L1 project prioritization metrics:
  owner table includes pending approvals + rejected count + status flag (green/amber/red).
- [x] L2 Client executive snapshot:
  30-second page with overall progress, projected rating, RAG per location, token burn trend, wallet balance.
- [x] L2 executive snapshot baseline:
  one-screen client panel with overall status, projected rating, completion, active projects, at-risk count, token runway.
- [x] L2 risk and portfolio panel:
  per-project risk table (`On Track`, `Delay Risk`, `Critical`) with pending/rejected counts.
- [x] L2 token intelligence panel:
  loaded/used/remaining tokens, burn rate, estimated exhaustion weeks.
- [x] L2 efficiency baseline metrics:
  first-time approval rate, rejection rate, avg tokens/project, efficiency score.
- [x] L2 one-click reporting baseline:
  direct PDF summary export links from executive panel.
- [x] L3 Project Admin high-throughput queue:
  cross-project validation feed, quick actions, rejection template library, audit-accurate timestamps (IST).
- [x] L3 cross-project command view baseline:
  project admin section with progress, pending validation, rejections, and submission readiness.
- [x] L3 queue performance counters:
  reviewed/approved/rejected today and approval-rate card in review queue.
- [x] L3 rejection template engine baseline:
  bulk rejection supports typed template messages for repeat scenarios.
- [x] L5 Super User monetization panel:
  client wallets, token top-ups, monthly usage split (uploads vs consulting), and manual override controls.
- [x] L5 command-center baseline:
  multi-client wallet table, project counts, client status, and super-user token override form.
- [x] L5 token economy baseline:
  sold/consumed/weekly burn/revenue estimate + upload vs consulting spend split.
- [x] L5 system health baseline:
  uploads today, failed transactions, pending reviews, active users.
- [x] L5 critical alert baseline:
  low-wallet and queue/anomaly alerts surfaced in super-user panel.
- [ ] Notifications:
  email/WhatsApp style alerts for rejection, resubmission, pending-review aging, and low-token warnings.
- [x] Session continuity:
  reduce unwanted session drops/logouts for low-frequency users.

## Priority 0A - Architect workflow (Priya) critical path

- [x] Credit-to-document slot mapping:
  render per-credit required document slots (certificate/spec/invoice) with mandatory/optional markers.
- [x] Multi-file upload structure per credit:
  preserve grouped uploads by credit + requirement slot (not generic flat uploads).
- [x] Pre-review editable mapping:
  allow move/edit/delete while `status = uploaded`; lock at `owner_approved` and above.
- [x] Architect pre-validation checklist:
  visible per-credit checklist (`uploaded` / `missing`) before owner review.
- [x] Structured rejection taxonomy:
  `missing_data`, `incorrect_format`, `outdated_document`, `wrong_credit_mapping`.
- [x] Duplicate guard:
  detect likely duplicate file name/hash and prompt reuse before charging token.
- [x] Vendor intelligence baseline:
  enable vendor doc reuse suggestions by vendor + doc type history.
- [x] Architect scope readiness:
  role-scoped progress card (`completed`, `incomplete`, `rejected`) for assigned architect credits only.
- [ ] Architect notification rules:
  actionable reject/missing/completion notifications without spam.

## Priority 1 - Production blockers (must close before release)

- [ ] Run full end-to-end live workflow with real role accounts and real data:
  login -> dashboard -> create/open project -> upload -> Project Owner review -> Project Admin review -> included in submission pack -> XLSX/PDF/ZIP export.
- [ ] Apply and verify live migration `supabase/migrations/0009_document_activity_logs.sql` in production Supabase.
- [ ] Verify upload integrity for every upload:
  Supabase storage object exists + matching `documents` row + signed URL opens.
- [ ] Verify `super_user`-only project delete in live session.
- [ ] Verify document delete visibility/permissions in live session (`super_user` and `project_admin` policy as implemented).
- [ ] Verify role-based edit/status restrictions across:
  `super_user`, `super_admin`, `project_admin`, `client`, `owner`, `architect`, `mep`, `contractor`.
- [ ] Verify document activity log visibility only for `super_user` and `project_admin`.

## Priority 2 - New business-model scope gaps (from updated plan)

- [x] Implement plans/pricing model with per-project quotas:
  document credits and consultant interaction credits.
- [x] Implement real-time usage tracking (consumed vs remaining credits per project).
- [x] Implement consultant interaction session logger that decrements consultant credits.
- [x] Implement billing/invoicing module (plan usage, top-ups, invoice records).

## Priority 3 - Product workflow gaps (from updated plan)

- [x] Add per-credit "What to Submit" guidance in clear client language.
- [x] Add credit difficulty classification (`Easy`, `Moderate`, `Hard`) and surface it in workspace.
- [x] Complete rejection + resubmit lifecycle:
  rejected -> resubmitted -> owner review -> admin review with reason trail.
- [x] Extend audit trail beyond current document logs to full history for key actions:
  project/member changes, credit status changes, workflow transitions.
- [x] Add/verify jargon-free client view distinct from consultant/admin workspace.
- [x] Add per-credit cost/effort guidance.
- [x] Complete onboarding checklist flow for first-time users.

## Priority 4 - Submission and export correctness

- [x] Verify submission pack includes only admin-approved/included documents.
- [x] Verify mandatory-credit gating blocks submission export when incomplete.
- [ ] Validate tracker/PDF/ZIP outputs against final CCIL/IGBC expected structure and naming.

## Priority 5 - Copilot readiness

- [ ] Validate Copilot behavior on all tabs against live project data.
- [x] Improve grounding to reliably answer with project-specific documents/credits/status.
- [x] Confirm role-safe Copilot responses (no overexposure of restricted data).

## Priority 6 - Deployment and QA closeout

- [ ] Run deployed smoke test on production URL:
  login, dashboard, projects, documents upload/open, workspace review, exports.
- [ ] Verify uploads from deployed environment (not only localhost).
- [ ] Run mobile QA pass (login/dashboard/projects/documents/workspace) and resolve responsive issues.
- [ ] Run role-based UAT signoff matrix and attach evidence.

## Execution order

1. Close Priority 1 live blockers.
2. Implement Priority 2 business-model modules.
3. Complete Priority 3 workflow/product gaps.
4. Finish Priority 4 export correctness checks.
5. Complete Priority 5 Copilot grounding and safety.
6. Finish Priority 6 deployment/mobile/UAT signoff.

## Technical Epics (Prioritized)

Reference: `ARCHITECTURE_GAP_ACTION_PLAN.md`

## Critical

- [x] Epic C1 - Workflow engine state machine:
  replace scattered status checks with centralized `workflow/state-machine.ts` and guarded transitions.
- [ ] Epic C2 - Event-driven foundation:
  implement `events/event-bus.ts` with producers/consumers and retry/dead-letter behavior.
- [ ] Epic C3 - AI subsystem baseline:
  implement `ai-engine` foundation (RAG + validator + rejection intelligence capture).
- [ ] Epic C4 - Transaction-safe token ledger:
  enforce idempotent upload/token orchestration with immutable debit/credit references.

## High

- [x] Epic H1 - Dedicated review event model:
  add `document_reviews` trail table and wire all approvals/rejections through immutable review entries.
- [ ] Epic H2 - Production-grade notification delivery:
  extend in-app notifications to email/WhatsApp channels with anti-spam rules and deep links.
- [ ] Epic H3 - Security verification suite:
  automated RBAC and project-isolation tests for all role/action combinations.
- [ ] Epic H4 - AI risk and recommendation services:
  deliver risk scoring and next-best-action generation per role/project.

## Medium

- [x] Epic M1 - Service layer extraction:
  move core business logic from `app/actions.ts` into `lib/services/*` modules.
- [ ] Epic M2 - Frontend real-time behavior:
  role-aware dynamic queue/alert updates via polling or realtime subscriptions.
- [ ] Epic M3 - Monetization intelligence v2:
  burn-rate forecasting, anomaly detection, and token usage trend analytics.
- [ ] Epic M4 - Vendor intelligence:
  document reuse suggestions and duplicate-avoidance recommendations by vendor/doc-type history.

## Technical Delivery Windows (12-week alignment)

- [ ] Weeks 1-3 (Foundation): close `C1`, `C4`, `H1`.
- [ ] Weeks 4-6 (AI Foundation): close `C3` baseline and capture rejection patterns.
- [ ] Weeks 7-9 (Intelligence): close `H4`, `M3`, and client/admin forecast widgets.
- [ ] Weeks 10-12 (Scale): close `C2`, `M2`, and performance/observability hardening.
