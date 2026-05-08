# Tracknov TODO (Pending Items Only)

Last updated: 2026-04-29 IST  
Baseline: `tracknov-project-plan.md` (including merged updated scope overlay)

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
- [x] Verify role-based edit/status restrictions across:
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

- [ ] Epic H1 - Dedicated review event model:
  add `document_reviews` trail table and wire all approvals/rejections through immutable review entries.
- [ ] Epic H2 - Production-grade notification delivery:
  extend in-app notifications to email/WhatsApp channels with anti-spam rules and deep links.
- [ ] Epic H3 - Security verification suite:
  automated RBAC and project-isolation tests for all role/action combinations.
- [ ] Epic H4 - AI risk and recommendation services:
  deliver risk scoring and next-best-action generation per role/project.

## Medium

- [ ] Epic M1 - Service layer extraction:
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
