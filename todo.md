# Tracknov TODO (Updated from TRACKNOV_FINAL_HANDOFF_WITH_BUILD_PLAN.md)

Last updated: 2026-05-06 IST (P0 DB-native validation/scoring/assignment + policy deviation fixes)
Primary source: `C:\Users\91922\Downloads\TRACKNOV_FINAL_HANDOFF_WITH_BUILD_PLAN.md`

## Priority
- `P0` = release blocker
- `P1` = production must-have
- `P2` = scale layer

---

## Handoff-driven implementation track (artifacts)

Source bundle copied to:
- `C:\Users\91922\Documents\Codex\tracknov\harita\artifacts\handoff`
- Plan file: `C:\Users\91922\Documents\Codex\tracknov\harita\artifacts\IMPLEMENTATION_PLAN_FROM_HANDOFFS.md`

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
- [ ] WP-9 E2E UAT and release readiness

---

## P0 - Immediate blockers

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
- [~] Role enforcement (L0/L1/L2/L3/L5).

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
- [~] Auto-generate tasks for upload/review/validate/fix.
- [x] Role-specific task visibility.

### Phase 6 - Dashboard
- [x] L1 dashboard counts + credit breakdown.
- [x] L2 dashboard summary/progress view.

### Phase 7 - Stage system
- [~] Stage gating: Design -> Construction -> Handover.
- [x] Stage-wise submission packs.

### Phase 8 - Reviewer simulation
- [ ] "Run Check" trigger.
- [ ] Rule-based completeness/consistency/compliance checks.

### Phase 9 - Rulebook engine
- [~] AI extraction draft from guidebook/rulebook.
- [ ] Admin validation UI.
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
- [ ] Assignment auto-creates tasks.

### Submission and compliance
- [x] Include only latest approved documents in submission pack.
- [x] Mandatory completion rule: all mandatory docs approved.
- [~] Full audit logging for every critical action.

---

## P2 - Scale/optimization

- [ ] Rulebook-aware RAG retrieval quality improvements for credit advice.
- [ ] Reviewer simulation scoring enhancements.
- [ ] Advanced analytics across stages and role performance.

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
