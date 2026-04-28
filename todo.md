# Tracknov TODO (Pending Items Only)

Last updated: 2026-04-29 IST  
Baseline: `tracknov-project-plan.md` (including merged updated scope overlay)

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
- [ ] Pre-review editable mapping:
  allow move/edit/delete while `status = uploaded`; lock at `owner_approved` and above.
- [ ] Architect pre-validation checklist:
  visible per-credit checklist (`uploaded` / `missing`) before owner review.
- [x] Structured rejection taxonomy:
  `missing_data`, `incorrect_format`, `outdated_document`, `wrong_credit_mapping`.
- [x] Duplicate guard:
  detect likely duplicate file name/hash and prompt reuse before charging token.
- [ ] Vendor intelligence baseline:
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
