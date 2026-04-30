# Tracknov Handoff

## Latest execution pass (2026-05-01, expanded role/engine handoffs imported)

- Imported additional handoff files from Downloads into repo root:
  - `Client_Developer_Handoff_Refined.md`
  - `ProjectOwner_Developer_Handoff.md`
  - `Contractor_Developer_Handoff.md`
  - `Architect_Developer_Handoff.md`
  - `MEPCON_Developer_Handoff.md`
  - `Documents_Engine_Developer_Handoff.md`
  - `Credits_Engine_Developer_Handoff.md`
  - `Workflow_Engine_Developer_Handoff.md`
  - `TokenEngine_Developer_Handoff.md`
  - `users_developerhandoff.md`
  - `ProjectAdmin_Developer_Handoff.md`
- Updated `todo.md` with a new mapped section:
  - **Role and Engine Handoffs TODO**
  - includes role tracks (MEP, Architect, Contractor, Owner, Project Admin, Client refined)
  - includes engine tracks (Workflow, Credits, Documents, Token, Users)
  - includes `HANDOFF-SYNC0` for cross-handoff conflict-resolution matrix.

## Latest execution pass (2026-04-30, P1 Core Architecture & Audit Logs)

- **Event-Driven Backbone (V2.6 & V2.7)**:
    - Expanded `EventBus` with new event types: `DOCUMENT_METADATA_UPDATED`, `DOCUMENT_DELETED`, `DOCUMENT_REJECTED`, `TOKEN_CREDITED`.
    - Integrated event emission into `DocumentService`, `ReviewService`, and `BillingService`.
    - Implemented `AIValidatorConsumer` for automated document validation hooks.
    - Expanded `NotificationConsumer` to handle rejections and token credits.
- **Review Model Wiring (Epic H1)**:
    - Wired `document_reviews` table into `ReviewService.transitionDocument` and `bulkReview`.
    - Every review action now creates an immutable record in `document_reviews` for a perfect audit trail.
- **Database Completeness (V2.8)**:
    - Migration `0024_ai_readiness.sql` adds `embeddings` (pgvector), `rejection_patterns`, and `clients` tables.
- **Audit Logs for Exports (Epic P2)**:
    - Added activity logging to all project export API routes:
        - `export_tracker`
        - `export_summary_pdf`
        - `export_submission_pack`
- **API Surface Completion (V2.9)**:
    - Added `getWalletBalance` and `getTransactionHistory` to `BillingService`.
    - Created `AIService` for document suggestions and project risk scoring.
- **Validation**:
    - Verified event-driven backbone via scratch test script.
    - `npm run build` passed successfully.

## Latest execution pass (2026-04-30, V2.5 Service-Layer Refactor)

- **Monolithic Action Extraction**:
    - Successfully refactored `app/actions.ts`, reducing it from ~1800 lines to ~660 lines.
    - All business logic for billing, documents, reviews, projects, and team members migrated to dedicated services:
        - `billing-service.ts`: Managed token consumption, plan updates, and top-up invoicing.
        - `document-service.ts`: Managed document lifecycle (upload, metadata, deletion, resubmit).
        - `review-service.ts`: Managed transitions, remarks, and bulk actions.
        - `member-service.ts`: Managed team member provisioning and invite acceptance.
        - `project-service.ts`: Managed project lifecycle and audit logging.
        - `credit-service.ts`: Managed credit status, requirements, and guidance.
- **Unified Side Effects**:
    - Centralized activity logging and notifications within the service layer.
    - Standardized RBAC enforcement across all service methods.
- **Architectural Integrity**:
    - Removed redundant helper functions and consolidated imports in `app/actions.ts`.
    - Verified `MemberService` recovery and logic restoration after accidental deletion.
- **Validation**:
    - `npm run build` passed successfully.
    - Service methods confirmed as thin, focused, and testable wrappers for Supabase/DB logic.

## Latest execution pass (2026-04-30, V2.3 Review Decoupling & Workflow Hardening)

- **Centralized Workflow Engine (`document-state-service.ts`)**:
    - Integrated logic previously scattered across multiple services into a single unified engine.
    - Added automated activity logging and review event recording directly into `transitionDocumentState`.
    - Integrated automated notifications for all significant state changes.
    - Added support for persistent review remarks and `remarks` table synchronization.
- **Action Layer Hardening (`app/actions.ts`)**:
    - Refactored `bulkReviewDocumentsAction`, `resubmitDocumentAction`, and `setDocumentStatusAction` to use the unified engine.
    - Removed manual logging/recording calls in favor of service-level automation.
    - Enforced atomic state transitions with RBAC-guarded gates.
- **Architectural Cleanup**:
    - Deleted redundant legacy workflow services:
        - `workflow-service.ts`
        - `document-workflow-service.ts`
        - `credit-workflow-service.ts`
        - `project-workflow-service.ts`
        - `workflow-log-service.ts`
        - `state-machine.ts`
- **Validation**:
    - Verified RBAC boundaries via `rbac-matrix.spec.ts` (all tests passed).
    - Verified event-driven review logs in DB.

## Latest execution pass (2026-04-30, client handoff mapped)

- Added client baseline file:
  - `Client_Developer_Handoff.md`
- Updated `todo.md` with dedicated **Client Layer TODO** mapping:
  - Client P1: executive visibility + wallet + efficiency metrics
  - Client P2: risk engine + forecasting + restricted drilldowns
  - Client P3: reports + actionable alerts
  - Client P4: API/data-model/isolation coverage
  - Client P5: UX/performance/testing gates
- This handoff is now an active reference for L2/client-facing delivery.

## Latest execution pass (2026-04-30, SaaS sales handoff mapped)

- Added sales enablement baseline file:
  - `SAASsales_Developer_Handoff.md`
- Updated `todo.md` with a dedicated **SaaS Sales Enablement TODO** section mapped to this handoff:
  - Sales P1 (Immediate): ROI engine + executive dashboard
  - Sales P2: guided demo mode
  - Sales P3: case study generator
  - Sales governance: integration, isolation, and scope guardrails
- This handoff is now an active reference for product-led sales conversion features in Tracknov.

## Latest execution pass (2026-04-30, IGBC handoff mapped)

- Added IGBC architecture baseline file:
  - `IGBC_Developer_Handoff.md`
- Updated `todo.md` with a dedicated **IGBC Engine TODO** section mapped to this handoff:
  - IGBC P0: credit-stage foundation
  - IGBC P1: workflow/control/override/versioning/inheritance engines
  - IGBC P2: scoring + submission pack engines
  - IGBC P3: audit + export + compliance validations
  - IGBC P4: RBAC/governance enforcement + hard-rule tests
- This file is now a primary backend execution reference for turning Tracknov into an IGBC certification engine.

## Latest execution pass (2026-04-30, UX handoff mapped)

- Added UX handoff baseline file:
  - `UX_UI_developer_handoff.md`
- Updated `todo.md` with a dedicated **UX/UI V2 TODO** section mapped directly to this handoff:
  - UX P0: scope + global nav lock
  - UX P1: screen coverage
  - UX P2: role/state driven rendering
  - UX P3: journey + component architecture refactor
- This UX handoff is now the active reference for frontend execution sequencing.

## Latest execution pass (2026-04-30, V2 P0.1 + P0.2)

- Completed **V2.0 workflow state alignment bridge**:
  - Added canonical V2 review-state mapping in `lib/services/document-state-service.ts`:
    - `uploaded`
    - `owner_review`
    - `admin_review`
    - `approved`
    - `rejected`
  - Added converters:
    - `toCanonicalReviewState(...)`
    - `fromCanonicalReviewState(...)`
  - Updated `transitionDocumentStateAction` in `app/actions.ts` to accept canonical V2 state names and map them into internal workflow states.
- Completed **V2.1 RBAC hard enforcement tightening**:
  - `lib/rbac.ts`:
    - tightened `canUploadProjectDocuments` (client and owner removed from uploader set; L0 roles + super_user retained)
    - removed `client` from `canEditOwnDocumentBeforeFinalApproval`
    - added role helpers: `isL0Role`, `isL1Role`, `isL2Role`, `isL3Role`, `isL5Role`
  - `lib/services/document-state-service.ts`:
    - enforced L2 (`client`) as read-only for workflow state transitions
    - enforced L1 (`owner`) owner-stage-only actions
    - enforced L3/L5 requirements for final approval/rejection paths
  - `app/actions.ts`:
    - bulk review role/state gates updated so owner actions operate on `SUBMITTED`, final reviewer actions on `UNDER_REVIEW`.
- Validation:
  - `npm run build` passed successfully.
- Tracking updates:
  - Marked V2 P0 items complete in `todo.md`:
    - `V2.0`
    - `V2.1`

## Latest execution pass (2026-04-30, AI handoff baseline linked)

- Added new architecture baseline file:
  - `Ai developerhandoff.md`
- Updated `todo.md` with a dedicated **Tracknov V2 TODO** section mapped to that handoff:
  - P0 foundation-critical items
  - P1 architecture/scale items
  - P2 AI intelligence items
  - P3 frontend/performance items
  - explicit V2 delivery checklist
- This `Ai developerhandoff.md` is now treated as the active V2 execution reference for incoming agents.

## Latest execution pass (2026-04-30, P1 Review Workflow hardening)

- Completed **P1.4 Review Workflow** wiring against workflow states:
  - `getOwnerReviewQueue` now uses `documents.workflow_state` instead of legacy status:
    - Owner queue: `SUBMITTED`
    - Project Admin/Super roles queue: `UNDER_REVIEW`
  - `bulkReviewDocumentsAction` now enforces strict state + role gates:
    - Owner approve allowed only when current state is `SUBMITTED` -> transition to `UNDER_REVIEW`
    - Final reviewer approve (project_admin/super_admin/super_user) allowed only when current state is `UNDER_REVIEW` -> `APPROVED`
    - Reject/send-back allowed only from `UNDER_REVIEW`, with mandatory rejection type + detailed remark
  - Review queue UI dropdown formatting bug fixed (`wrong_document` option rendering).
  - Reviewer metrics now read workflow transition details (`to_state`) from activity logs, not stale `to_status` keys.
- Validation:
  - `npm run build` passed successfully.
- Tracking updates:
  - Marked all **P1 section 4** checklist items complete in `todo.md`.

## Latest execution pass (2026-04-30, P1 Project-Credit + Document Linkage)

- Implemented **P1.2 Project -> Credit Mapping** baseline:
  - Added migration: `supabase/migrations/0022_project_credit_and_document_linkage.sql`
  - Added `project_credits` table with project-level credit instance status.
  - Backfilled `project_credits` for existing projects/credits.
  - Updated `createProjectForCurrentUser` to auto-create `project_credits` right after seeded project credits.
  - Updated upload options loader to read credit options through `project_credits` instances.
- Implemented **P1.3 Document -> Credit Linkage** baseline:
  - Migration adds document linkage/versioning columns:
    - `project_credit_id`
    - `version`
    - `is_latest`
    - `parent_document_id`
  - Backfilled linkage + latest/version lineage for existing documents.
  - Updated `uploadDocumentAction` to require and validate project-credit mapping before upload insert.
  - Upload flow now versions by `(project_credit_id, doc_category)` and auto-links previous version as parent.
  - Duplicate detection now scoped to `(project_id, project_credit_id, doc_category)` active docs.
  - Upload metadata + token log payload now include `project_credit_id` and `version`.
- UI wiring:
  - `components/project/general-upload-document-form.tsx` now posts `project_credit_id`.
  - `components/project/upload-document-form.tsx` now posts `project_credit_id`.
  - `app/projects/[id]/page.tsx` passes `projectCreditId` into project upload form.
  - `lib/types.ts` extended with `project_credit_id`, versioning fields, and credit workspace mapping field.
- Verification run:
  - `npm run build` passed successfully on 2026-04-30 IST.
- TODO update:
  - Marked P1.2 and P1.3 checklist items complete in `todo.md`.

## Latest execution pass (2026-04-30, Epic C1 Workflow Engine State Machine)

- Completed **Epic C1 - Workflow engine state machine**:
  - Enhanced `lib/workflow/state-machine.ts` with `getTransitionPayload` and `getTransitionSideEffects` to strictly define database updates and side effects (logs, remarks, notifications) based on state transitions.
  - Introduced `lib/services/workflow-service.ts` to centralize document status updates and safely dispatch all side effects.
  - Gutted the monolithic `setDocumentStatusAction` in `app/actions.ts` and replaced it with a clean pass-through invocation to the new workflow service.
  - Verified TypeScript compilation for full type safety across transitions.
- Updated `TODO.md`:
  - Marked `Epic C1` as complete.

## Latest execution pass (2026-04-30, P0 UX quality gates completion)

- Completed **UX0.12 UX quality/speed gates** with executable checks:
  - added Playwright suite `tests/ux-quality-gates.spec.ts`
  - checks include:
    - login render without runtime/server error overlay
    - key path response safety (`/login`, `/dashboard`, `/projects`, `/documents`, `/credits`, `/team`)
    - mobile viewport readability for login controls
- Added package script:
  - `npm run qa:ux`
- Executed validation:
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 npm run qa:ux`
  - result: **3 passed**
- Updated `todo.md`:
  - marked `Epic UX0.12` complete.

## Latest execution pass (2026-04-30, P0 UX sprint continuation)

- Executed P0 continuation per request (notifications intentionally deferred).
- Completed **UX0.6 Upload experience hardening (mobile-first)** in `components/project/general-upload-document-form.tsx`:
  - drag-and-drop upload zone with visual active state
  - camera capture action (`Capture photo`) for site-first mobile uploads
  - persistent selected-file queue with clear action before submit
  - stronger submit guard (disabled until at least one file is selected)
  - existing pre-submit 5-second cancel safety retained
  - existing persistent success confirmation retained
- Updated `todo.md`:
  - marked `Epic UX0.6` as complete.
- Build verification:
  - `npm run build` completed successfully.

### P0 status after this pass

- Completed: `UX0.1` to `UX0.11` except `UX0.12`.
- Still open: `UX0.12` (quality/speed gates and full mobile QA hardening).

## Latest execution pass (2026-04-29, L0-L5 pending-role closure sweep)

- Implemented L0 upload/workflow hardening in `components/project/general-upload-document-form.tsx`:
  - 3-step upload UX (project+credit -> doc slot/type -> file)
  - mobile-friendly stacked flow
  - multi-file upload support (single mapped batch context)
  - persistent success confirmation card with last-uploaded filename
  - duplicate guard (same project+credit+doc-type+filename) before token burn
  - requirement-slot mapping (`requirement_slot`) passed on upload
  - suspicious cross-project filename warning
- Implemented rejection quality enforcement in `app/actions.ts` + UI:
  - rejection now requires:
    - structured rejection type
    - minimum remark length (20 chars)
  - taxonomy now includes:
    - `missing_data`
    - `incorrect_format`
    - `wrong_document`
    - `poor_quality`
    - `outdated_document`
    - `wrong_credit_mapping`
  - wired in:
    - `/documents`
    - `/projects/[id]` review panel
    - `/review-queue` bulk send-back
- Implemented notification backbone in `app/actions.ts` (in-app notifications table):
  - owner notified on new upload
  - project admin/super admin notified when owner forwards to admin review
  - uploader notified on rejection
  - uploader notified on final approval
  - owner notified on resubmission
- Implemented session continuity support:
  - `components/session-heartbeat.tsx` (client keepalive ping every 8 minutes)
  - `app/api/session/heartbeat/route.ts` (auth heartbeat endpoint)
  - mounted globally in `components/shell.tsx`
- Implemented architect/L0 scope visibility in `app/documents/page.tsx`:
  - role-scoped readiness card for contributor roles (`architect`, `mep`, `contractor`)
  - cards: assigned docs, completed, incomplete, rejected
- Updated `todo.md` to reflect the closed role items from this pass.
- Build verification:
  - `npm run build` completed successfully.

### Remaining open from this role sweep

- Notification delivery beyond in-app table (email / WhatsApp push automation) is still pending.
- `Priority 0A` still open for:
  - vendor intelligence/reuse suggestions
  - architect notification anti-spam rules
  - full grouped requirement-slot persistence model at DB level (current slot is appended in notes metadata).

## Latest execution pass (2026-04-29, Super User command center baseline)

- Added L5 super-user command center on `app/team/page.tsx` (visible only to `super_user`):
  - multi-client portfolio table:
    - client name
    - wallet balance
    - project count
    - status (`Active` / `Needs Top-Up`)
  - token economy panel:
    - total tokens sold
    - total consumed
    - weekly burn
    - revenue estimate
    - spend split (upload vs consulting) and refund tracking from transaction history
  - system health panel:
    - uploads today
    - failed transactions (flag-based)
    - pending review queue size
    - active user count
  - critical alerts panel:
    - low wallet thresholds
    - transaction anomaly marker
    - queue spike alerts
  - override controls:
    - super-user token top-up form using existing `loadClientTokensAction`
    - project-context bound override flow (no DB manual edits required)
  - recent transaction list (IST timestamp rendering)
- Added backend aggregator in `lib/data.ts`:
  - `getSuperUserCommandCenter()`
  - computes client-level, token-economy, health, alerts, and recent transaction snapshots from live tables.
- Build verification:
  - `npm run build` completed successfully.

## Latest execution pass (2026-04-29, Project Admin throughput block)

- Implemented L3-focused throughput upgrades:
  - Cross-project command section added on `/projects` for `project_admin`, `super_admin`, `super_user`:
    - progress
    - pending validation count
    - rejection count
    - submission readiness flag
    - direct link to validation queue
  - Review queue performance cards added on `/review-queue`:
    - reviewed today
    - approved today
    - rejected today
    - approval rate %
- Added rejection template engine baseline in `bulkReviewDocumentsAction`:
  - template keys:
    - `missing_data`
    - `wrong_document`
    - `poor_quality`
    - `outdated_document`
    - `wrong_credit_mapping`
  - if custom remark is blank and template selected, system auto-applies template message
  - rejection remark trail is still persisted with template tag for audit clarity
- Build verification:
  - `npm run build` completed successfully.

## Latest execution pass (2026-04-29, Client executive dashboard baseline)

- Implemented L2 (Client/CXO) decision dashboard layer in `app/dashboard/page.tsx`:
  - one-screen executive summary cards with:
    - overall status
    - projected rating
    - overall completion
    - active project count
    - at-risk count
    - token balance and runway estimate
  - portfolio risk table:
    - project-level completion
    - pending approvals
    - rejected count
    - risk badge (`On Track`, `Delay Risk`, `Critical`)
  - token consumption intelligence:
    - loaded / used / remaining
    - weekly burn estimate
    - estimated exhaustion weeks
  - efficiency indicators:
    - first-time approval rate
    - rejection rate
    - average tokens per project
    - aggregate efficiency score
  - one-click reporting baseline:
    - direct project PDF summary export buttons from executive panel
- Enriched `ProjectSummary` model in `lib/types.ts` and aggregate computation in `lib/data.ts`:
  - `pendingReviewsCount`
  - `rejectedCount`
  - `statusFlag` (`green`/`amber`/`red`)
- Build verification:
  - `npm run build` completed successfully.

## Latest execution pass (2026-04-29, Project Owner review acceleration)

- Extended Anita-facing controls for high-throughput review:
  - owner dashboard now includes explicit:
    - pending approvals count
    - rejected count
    - status flag (`green`/`amber`/`red`) on each project row
  - risk badge logic now also reads project status flag plus queue pressure
- Review queue upgraded from table-only to preview-first cards:
  - embedded inline document preview (`iframe`) per queued item
  - uploader identity + IST upload timestamp + notes shown inline
  - still supports open-full-document link where needed
- Added structured rejection taxonomy in queue actions:
  - reject reason types:
    - `missing_data`
    - `wrong_document`
    - `poor_quality`
    - `outdated_document`
    - `wrong_credit_mapping`
  - rejection type is prefixed into persisted remark trail for clarity
- Added one-click high-volume action:
  - `Approve All Listed` action on review queue
  - existing multi-select bulk approve/send-back preserved
- Data model enrichment in project summaries:
  - `pendingReviewsCount`
  - `rejectedCount`
  - `statusFlag`
- Build verification:
  - `npm run build` completed successfully.

## Latest execution pass (2026-04-29, Architect workflow scope lock)

- Captured Priya (Architect) persona as a dedicated implementation stream.
- Added `Priority 0A - Architect workflow` in `todo.md` with explicit outcomes:
  - per-credit document-slot mapping with mandatory/optional structure
  - grouped multi-file upload behavior by requirement slot
  - editable mapping before review lock
  - pre-review completeness checklist
  - structured rejection taxonomy
  - duplicate detection and vendor-document reuse baseline
  - role-scoped architect readiness summary
  - actionable architect notifications
- Implementation sequence set for next coding pass:
  1. slot-mapped upload + checklist enforcement
  2. structured rejection types in review actions
  3. duplicate guard + token-safe reuse prompts
  4. vendor intelligence and architect readiness panel

## Latest execution pass (2026-04-29, Project Owner workflow block)

- Implemented Anita-focused owner workflow baseline:
  - one-screen owner command table on dashboard:
    - per-project progress
    - pending uploads
    - pending owner review count
    - consultant-side queue indicator
    - risk badge (`On Track`, `Delayed`, `Risk`)
  - token visibility summary added in owner section:
    - document tokens remaining
    - document tokens used
    - consultant credits used
    - action queue count
- Added dedicated owner/admin review queue page:
  - route: `/review-queue`
  - clean queue rows with:
    - project
    - credit name
    - uploader
    - filename + notes
    - IST upload timestamp
    - preview link
- Added bulk review action backend:
  - new server action `bulkReviewDocumentsAction` in `app/actions.ts`
  - supports:
    - bulk approve (owner: `uploaded -> owner_approved`, admin: `owner_approved -> approved`)
    - bulk send-back (`-> rejected`) with mandatory shared reason
  - logs document activity and writes remark entries for rejections
  - revalidates dashboard/documents/review-queue/project paths
- Added navigation entry:
  - `Review Queue` tab in shell nav for `owner`, `project_admin`, `super_admin`, `super_user`
- Build verification:
  - `npm run build` completed successfully.

## Latest execution pass (2026-04-29, MEP contributor workflow hardening)

- Implemented high-priority L0 contributor improvements from persona requirements:
  - role-scoped project workspace filtering for `mep`, `architect`, and `contractor`
  - credit list and counters now scoped to contributor-assigned credits
  - L0 table view hides credit-code column and emphasizes plain credit names
- Added stronger upload guardrails:
  - token debit now runs only after storage upload and DB insert both succeed
  - rollback cleanup added when DB insert fails (storage file removed)
  - rollback cleanup added when token debit fails (document row + storage file removed)
- Added accidental-upload protection:
  - pre-submit confirmation block with 5-second cancel window before upload dispatch
  - explicit destination summary (project, credit, document type, filename)
- Added requirement clarity in upload surface:
  - credit-level "required evidence" guidance in upload form
  - active/inactive requirement tags shown before upload
- Added credit sample-document schema support:
  - migration `supabase/migrations/0016_credit_sample_documents.sql`
  - `sample_document_url` field in credit workspace model and right-panel action link
- Added L0 token-safe correction path:
  - uploader can delete own unreviewed (`uploaded`) document
  - automatic token refund issued on eligible delete
  - admin delete behavior retained for elevated roles
- Build verification:
  - `npm run build` completed successfully after these changes.

## Latest execution pass (2026-04-29, persona-driven scope lock)

- Captured and translated stakeholder persona requirements into build execution priorities.
- Updated `todo.md` with a new **Priority 0** section covering role-specific outcomes for:
  - `L0` MEP/Architect/Contractor
  - `L1` Project Owner
  - `L2` Client
  - `L3` Project Admin
  - `L5` Super User
- Priority 0 now explicitly drives:
  - token-safe upload behavior (no deduction on failed flow)
  - role-scoped credit visibility for contributors
  - rejection-quality enforcement
  - review cockpit with document preview
  - client executive summary
  - super-user monetization/usage control panel
- Next implementation block started:
  - L0 upload safety + requirement clarity + token-protection rules
  - then L1/L3 review queue simplification and rejection templates.

## Latest execution pass (2026-04-28, plan quotas + usage tracking)

- Completed updated TODO Priority 2 items:
  - plans/pricing model with per-project quotas
  - real-time usage tracking (consumed vs remaining)
- Added migration:
  - `supabase/migrations/0010_project_plans_usage.sql`
  - introduces `subscription_plans`, `project_billing_settings`, `consultant_sessions`, and `project_usage_summary` view
  - seeds active plans: Starter, Growth, Enterprise
  - adds RLS policies for plan read and project-billing access control
- Project creation now auto-initializes billing settings:
  - default plan `starter`
  - default document and consultant credit limits from seeded plan table
- Projects page now surfaces plan + usage data and includes plan controls:
  - plan selection
  - base document/consultant limits
  - top-up credits
- Upload guard added:
  - document upload is blocked when document-credit quota is exhausted
- Build verification:
  - `npm run build` completed successfully after implementation.

## Latest execution pass (2026-04-28, consultant session credit logger)

- Completed updated TODO item:
  - consultant interaction session logger with consultant-credit decrement behavior.
- Added backend session logging flow:
  - `logConsultantSessionForCurrentUser` in `lib/data.ts`
  - consumes project consultant credits against `project_usage_summary`
  - blocks logging when available consultant credits are exhausted
- Added server action:
  - `logConsultantSessionAction` in `app/actions.ts`
  - revalidates dashboard/projects/workspace views after each logged session
- Added UI controls in Projects tab:
  - "Consultant session logger" block under project controls
  - source, credits burned, and notes capture
  - logs directly into `consultant_sessions`
- Build verification:
  - `npm run build` completed successfully after this pass.

## Latest execution pass (2026-04-28, billing/invoicing module v1)

- Completed updated TODO item:
  - billing/invoicing module for plan usage and top-up records.
- Added migration:
  - `supabase/migrations/0011_billing_invoices.sql`
  - new tables: `project_topups`, `billing_invoices`
  - RLS policies for member visibility and admin-level invoice/top-up writes
- Added server-side billing workflow:
  - `createProjectTopupInvoiceForCurrentUser` in `lib/data.ts`
  - increments project top-up credits in `project_billing_settings`
  - stores top-up transaction in `project_topups`
  - creates issued invoice record in `billing_invoices` with line items and due date
- Added server action:
  - `createProjectTopupInvoiceAction` in `app/actions.ts`
- Added Projects UI controls:
  - "Billing & invoice" panel per project
  - captures doc credits, consultant credits, invoice amount, and notes
  - creates top-up + invoice in one flow
- Build verification:
  - `npm run build` completed successfully after this pass.

## Latest execution pass (2026-04-28, credit guidance + effort profiling)

- Completed updated TODO items:
  - per-credit "What to Submit" guidance
  - credit difficulty classification (`easy`, `moderate`, `hard`)
  - per-credit cost/effort guidance
- Added migration:
  - `supabase/migrations/0012_credit_guidance_fields.sql`
  - extends `credits` table with:
    - `what_to_submit`
    - `effort_level`
    - `effort_guidance`
- Added workspace display in project right panel:
  - "What to submit" guidance card
  - effort profile badge and guidance text
- Added admin controls (`project_admin` and `super_user`) to update:
  - what-to-submit text
  - effort level
  - effort guidance
- Added server action:
  - `updateCreditGuidanceAction` in `app/actions.ts`
- Copilot context now includes what-to-submit and effort guidance facts for project-specific assistance.
- Build verification:
  - `npm run build` completed successfully after this pass.

## Latest execution pass (2026-04-28, rejection -> resubmit workflow)

- Completed updated TODO item:
  - rejection + resubmit lifecycle with reason trail.
- Added server action:
  - `resubmitDocumentAction` in `app/actions.ts`
  - permitted for uploader/admin paths before final approval
  - resets document state from `rejected` -> `uploaded` (Project Owner review queue)
  - clears prior final-review markers and appends resubmission note to document notes
  - writes activity log entry with previous rejection reason and resubmission context
- Added Documents tab UI:
  - `Resubmit document` control appears for rejected docs where metadata edit is allowed
  - captures "what changed" note and returns file to owner-review stage
- Build verification:
  - `npm run build` completed successfully after this pass.

## Latest execution pass (2026-04-28, system activity audit trail expansion)

- Added migration:
  - `supabase/migrations/0013_system_activity_logs.sql`
  - new `system_activity_logs` table with RLS for member visibility and role-gated writes
- Added backend logging helper:
  - `logSystemActivity` in `app/actions.ts`
- Wired audit events for key non-document flows:
  - project create/update/delete
  - project billing plan updates
  - consultant session logs
  - top-up invoice creation
  - credit status changes (complete/blocked)
  - credit document-requirement updates
  - credit client-guidance updates
- Added project workspace visibility:
  - right-panel "Project activity log (IST)" section in `app/projects/[id]/page.tsx`
- Status:
  - audit-trail extension is partially complete;
  - team-member lifecycle logging remains pending before marking the TODO item complete.
- Build verification:
  - `npm run build` completed successfully after this pass.

## Latest execution pass (2026-04-28, onboarding + client-mode UX)

- Completed updated TODO items:
  - jargon-free client view distinct from consultant/admin mode
  - onboarding checklist flow for first-time users
- Added migration:
  - `supabase/migrations/0014_onboarding_checklists.sql`
  - persistent per-user, per-project checklist with RLS
- Added onboarding persistence APIs in `lib/data.ts`:
  - `getOrCreateOnboardingChecklist(projectId)`
  - `updateOnboardingChecklistForCurrentUser(projectId, key, value)`
- Added action:
  - `updateOnboardingChecklistAction` in `app/actions.ts`
- Dashboard updates:
  - onboarding checklist card with step completion toggles
  - client-mode labels and plain-language copy for KPI and project summaries
- Welcome page updates:
  - if no project: bootstrap create-workspace flow
  - if project exists: onboarding checklist with quick links to workspace/documents
- Build verification:
  - `npm run build` completed successfully after this pass.

## Latest execution pass (2026-04-28, audit trail completion for member lifecycle)

- Closed remaining gap in audit-trail item by adding team lifecycle events to `system_activity_logs`.
- Added team audit events in `app/actions.ts`:
  - `member_created` when a new login/profile/project assignment is provisioned
  - `invite_accepted` when an invited member joins the project
- This completes end-to-end activity capture across:
  - project events
  - credit workflow events
  - document workflow events
  - team provisioning and onboarding membership events
  - billing/session events
- Build verification:
  - `npm run build` completed successfully after this pass.

## Latest execution pass (2026-04-28, Copilot grounding + role safety)

- Completed updated TODO items:
  - improved Copilot grounding with project-specific priority snapshots
  - role-safe Copilot response constraints to reduce overexposure risk
- Updates made:
  - `lib/assistant.ts` prompt guardrails now explicitly enforce:
    - no secrets/internal IDs exposure
    - role-bound responses
    - safe refusal pattern for restricted requests
  - `app/api/assistant/route.ts` snapshot enrichment:
    - role-aware snapshot shaping (client view masks file-name detail)
    - priority pending-credit summary per project
    - resolved role injected into context facts
- Build verification:
  - `npm run build` completed successfully after this pass.

## Latest execution pass (2026-04-28, submission-pack rule validation)

- Completed updated TODO items:
  - submission pack includes only approved/included documents
  - mandatory-credit gating blocks export while incomplete
- Added export-rule helpers in `lib/exports.ts`:
  - `isSubmissionExportReady(workspace)`
  - `getApprovedSubmissionCredits(workspace)`
- Wired route/page to shared helpers:
  - `app/api/projects/[id]/submission-pack/route.ts`
  - `app/projects/[id]/submission/page.tsx`
- Added automated tests:
  - `tests/submission-rules.spec.ts`
  - validates mandatory gating and approved-only export filtering
- Test/build verification:
  - `npx playwright test tests/submission-rules.spec.ts` -> passed
  - `npm run build` -> passed

## Project Plan Baseline

- Canonical project plan file:
  - `tracknov-project-plan.md`
- Use this document as the default baseline for project-completion assessment and milestone tracking in future updates.

## Latest execution pass (2026-04-28, document logs + IST)

- Implemented document activity logging end-to-end in application workflow:
  - upload, metadata updates, status updates, and delete now write structured entries.
  - server action path used for uploads to guarantee log writes from trusted backend path.
- Added role-gated log visibility in Documents tab:
  - log panel is shown only to `super_user` and `project_admin`.
- Added migration for audit log persistence and RLS:
  - `supabase/migrations/0009_document_activity_logs.sql`
- Standardized displayed timestamps to Indian time zone (IST) across major pages:
  - Documents upload time
  - Team joined time
  - Project remarks time
- Build verification: `npm run build` passes after changes.

### Open follow-up from this pass

- Live DB apply for migration `0009` is pending in this environment because hostname resolution to Supabase DB endpoint failed during CLI migration execution.
- Next step is to apply `0009_document_activity_logs.sql` on the live project, then run role-based verification for log visibility and entries.

## Latest execution pass (2026-04-28)

- Closed remaining non-functional pending items from `todo.md`:
  - Empty states aligned on major tabs (`dashboard`, `projects`, `documents`, `team`, `credits`).
  - Tracknov identity cleanup completed for runtime surfaces (`app/`, `components/`, `lib/`, `scripts/`, `bin/`, `README`, launchers).
  - Legacy compatibility launchers removed (`Start-Harita.ps1`, `Start-Harita.bat`, `bin/harita.mjs`).
- Live Supabase verification completed against `uiecvxxamykfubgtqzap`:
  - RLS confirmed enabled on key public tables (`credits`, `documents`, `notifications`, `profiles`, `project_invites`, `project_members`, `projects`, `remarks`).
  - Storage/private access policies confirmed in `pg_policies` (`storage_select_project_documents`, `storage_insert_project_documents`, `storage_update_project_documents`).
  - Migration history confirmed in `supabase_migrations.schema_migrations` through `0007`.
  - `0006` helper functions verified as `security definer`.
  - `0007` document workflow status constraint verified and reapplied safely.
- Deployment readiness artifacts added:
  - `vercel.json`
  - `RELEASE_READINESS_CHECKLIST.md`
  - README deployment env section for Vercel.

### Note on migration tooling

- Migration filenames are normalized to a linear sequence (`0001` ... `0008`) and `supabase migration up` now runs successfully against the live project.
- Latest applied migration: `supabase/migrations/0008_project_rbac.sql`.

## Latest execution pass (todo.md implementation)

- Upload limits were aligned to plan:
  - `50 MB` -> `10 MB` in both document upload forms.
- Upload type validation was aligned to allowed project file types in UI:
  - PDF, DOCX, PNG, JPG/JPEG.
- Oversize guidance was added to upload forms with clear user-facing instructions to compress files.
- Global app error boundary was added:
  - `app/error.tsx`
- Loading states were added for major surfaces:
  - `app/loading.tsx`
  - `app/dashboard/loading.tsx`
  - `app/projects/loading.tsx`
  - `app/projects/[id]/loading.tsx`
  - `app/projects/[id]/submission/loading.tsx`
  - `app/documents/loading.tsx`
  - `app/team/loading.tsx`
  - `app/credits/loading.tsx`
  - shared loader: `components/ui/page-loading.tsx`
- Tracknov identity cleanup was executed for main metadata and onboarding surfaces:
  - `package.json` updated to Tracknov package/repo metadata.
  - `bin/tracknov.mjs` added and wired as primary launcher.
  - `Start-Tracknov.ps1` and `Start-Tracknov.bat` added.
  - Existing `Start-Harita.*` launchers now point to Tracknov binary for compatibility.
  - `README.md`, `.env.example`, onboarding scripts, and seed defaults updated to Tracknov naming.
- `todo.md` was updated with completed checkboxes for the implemented items in Priority 2 and parts of Priority 3.

## What is ready

- Tracknov is connected to the Supabase project at `uiecvxxamykfubgtqzap`.
- Core Supabase schema migrations up to the current local set have been prepared in `supabase/migrations/`.
- Live auth has been wired for Supabase login flows.
- The role hierarchy has been updated in the app:
  - `Super User` is the apex role.
  - `Project Admin` sits under `Super User`.
  - `Client` is the highest client-side role.
  - `Project Owner` reports to `Client`.
  - `Architect`, `MEP Consultant`, and `Contractor` report to `Project Owner`.
- Team creation rules were updated to reflect that hierarchy.
- Project RBAC helpers were added in `lib/rbac.ts`.
- Project controls were added:
  - create project for `super_user` and `super_admin`
  - update project for `super_user`, `super_admin`, and assigned `project_admin`
  - delete project for `super_user` only
- A new migration was added for project-level RBAC policies:
  - `supabase/migrations/0008_project_rbac.sql`
- Login page startup/build issue was fixed by wrapping the `LoginForm` search-param usage in `Suspense`.
- Production build now completes successfully.
- Document upload path was improved:
  - upload filenames are sanitized before storage upload
  - the upload form reset bug was fixed
  - Supabase membership helper functions were updated to `security definer` to prevent recursive RLS failures during upload
- A new migration was added for upload-policy/helper stability:
  - `supabase/migrations/0006_security_definer_membership_helpers.sql`
- Document workflow was upgraded from generic project-file intake to credit-mapped intake:
  - each upload is mapped to a credit at upload time
  - the Documents page now requires project, credit, and document-type mapping before upload
  - credit-workspace uploads use the same safer filename and reset behavior
- Document review workflow was upgraded to two steps:
  - `uploaded` -> pending `Project Owner` review
  - `owner_approved` -> pending `Project Admin` review
  - `approved` -> eligible for submission-pack inclusion
  - `rejected` -> excluded with remark trail
- A new migration was added for the document review workflow:
  - `supabase/migrations/0007_document_review_workflow.sql`
- Documents tab editing was expanded with role-aware controls:
  - contributors can edit only their own document mapping before final approval
  - `super_user`, `super_admin`, and `project_admin` can override status at any stage
  - `super_user`, `super_admin`, and `project_admin` can delete documents from Documents tab
- Document upload/change audit logging is implemented in app flow:
  - activity entries for upload, metadata update, status update, and delete
  - logs rendered under document actions for `super_user` and `project_admin`
- Document names in the Documents table are now secure hyperlinks:
  - each row opens the underlying file in a separate screen through signed URL routing
- Project workspace now includes the AI Validation Assistant panel in the review sidebar.
- A global AI Copilot is now mounted in the shared shell:
  - available on all tabs/pages using `Shell` (dashboard, projects, documents, credits, team, project workspace)
  - collapsible floating side window with persisted collapse state
  - per-tab chat history persisted by route path
  - uses existing `/api/assistant` endpoint with Gemini/fallback behavior
- A Bhavarkua ingestion artifact is ready:
  - `BHAVARKUA_UPLOAD_MAP.md` generated from the submitted ZIP against IGBC catalog expectations
  - generation script: `scripts/build-bhavarkua-upload-map.ps1`
- Obvious test projects named `Test` were deleted from the live Supabase project.

## What still needs to be done next

### 1. Verify document workflow end to end

The known blocking login-page build issue is fixed. The next live verification pass should cover the full document workflow:

- upload file from `/documents` with project -> credit -> document-type mapping
- confirm storage object is created
- confirm `documents` row is created
- confirm `uploaded` state appears as pending Project Owner review
- confirm Project Owner can forward the document to Project Admin
- confirm Project Admin can include it for submission pack
- confirm uploaded file opens from the UI
- confirm no further storage/database errors appear for larger PDFs
- confirm document delete is visible and works for `super_user`, `super_admin`, and `project_admin`

### 2. Use Bhavarkua upload map for structured ingestion

Use `BHAVARKUA_UPLOAD_MAP.md` as the pre-ingestion checklist:

- `Present`: ready to map/upload directly
- `Present but not structured`: evidence exists but folder pattern should be normalized
- `Missing`: confirm NA vs pending evidence before review stage

### 3. Normalize migration sequencing for CI/CD

Completed in this pass. The local sequence now matches runtime history (`0001` through `0008`), and standard `supabase migration up` runs cleanly.

## Files changed in this handoff batch

- `app/actions.ts`
- `app/api/documents/[id]/route.ts`
- `app/documents/page.tsx`
- `app/projects/[id]/page.tsx`
- `app/projects/page.tsx`
- `app/team/page.tsx`
- `lib/types.ts`
- `lib/data.ts`
- `lib/rbac.ts`
- `app/login/page.tsx`
- `components/project/general-upload-document-form.tsx`
- `components/project/upload-document-form.tsx`
- `BHAVARKUA_UPLOAD_MAP.md`
- `scripts/build-bhavarkua-upload-map.ps1`
- `supabase/migrations/0008_project_rbac.sql`
- `supabase/migrations/0006_security_definer_membership_helpers.sql`
- `supabase/migrations/0007_document_review_workflow.sql`
- `supabase/migrations/0009_document_activity_logs.sql`
- `HANDOFF.md`

## Files intentionally not meant for commit

- `.tmp-supabase-push/`
- `.tmp-supabase-fix/`
- `.tmp-supabase-fix-sql/`
- `devserver.log`
- `devserver.err.log`

These are local operational artifacts only.

## Update - 2026-04-30 (P0 W1 start: document workflow state engine)

Started P0 W1 implementation from `todo.md`:

- Added migration `supabase/migrations/0020_document_workflow_state.sql`:
  - creates enum `workflow_state` (`DRAFT`, `READY`, `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION`, `RESUBMITTED`, `APPROVED`, `REJECTED`)
  - adds `documents.workflow_state`
  - creates `document_states` transition table
  - backfills existing documents to workflow state + seeds initial `document_states` rows
- Added service `lib/services/document-state-service.ts`:
  - `transitionDocumentState(...)` with guarded transitions and explicit error responses
  - business rule checks for:
    - `DRAFT -> READY` required docs present
    - `READY -> SUBMITTED` manual trigger required
    - `SUBMITTED -> UNDER_REVIEW` reviewer assignment required
    - `CLARIFICATION -> RESUBMITTED` updated evidence required
  - inserts every transition into `document_states`
- Added server action `transitionDocumentStateAction(...)` in `app/actions.ts`
  - uses service layer and logs transition into `document_activity_logs`
- Enforced edit-lock start in `updateDocumentMetadataAction(...)`:
  - blocks edits in `SUBMITTED` / `UNDER_REVIEW`
  - allows edit window in `DRAFT` / `CLARIFICATION`

Verification:

- `npm run build` passed after changes.

Remaining W1 work:

- Route legacy review paths (`setDocumentStatusAction`, bulk review, resubmit) fully through `workflow_state` transitions.

## Update - 2026-04-30 (Strict transition spec alignment)

Implemented additional strict controls:

- Added role-aware enforcement inside `transitionDocumentState(...)`:
  - L3-only final decisions (`APPROVED`, `REJECTED`, `CLARIFICATION`)
  - L0 blocked from moving beyond `READY`
  - L1 blocked from overriding decisions
- Added migration `supabase/migrations/0021_activity_logs.sql`:
  - creates unified `activity_logs` table with RLS and indexes
- Updated activity logging calls to dual-write:
  - `document_activity_logs`
  - `activity_logs`
- Updated `setDocumentStatusAction(...)` to route through workflow state transition service.

Verification:

- `npm run build` passed.

## Latest execution pass (2026-04-30, total completion report + handover normalization)

- Prepared a full current-state completion report:
  - `PROJECT_COMPLETION_REPORT.md` refreshed to reflect current MVP status against:
    - `DEVELOPER_HANDOFF_MVP.md`
    - `tracknov-project-plan.md`
    - `todo.md`
- Report now distinguishes:
  - what is complete,
  - what is partially complete,
  - what blocks production sign-off,
  - and strict next execution order.
- Handover file standard finalized:
  - `HANDOFF.md` renamed to `AgentHandoff.md`
  - all future shift summaries should append here only.

Current blocker summary for next coding agent:

1. Complete strict workflow-state wiring in legacy review actions (remove bypass).
2. Implement `project_credits` (instance mapping auto-created per project).
3. Add document versioning (`version`, `is_latest`, `parent_document_id`).
4. Finish RBAC acceptance verification (L0-L5 hard checks).
5. Close export correctness validation (`APPROVED + is_latest` only).

## Latest execution pass (2026-04-30, P1 Workflow Engine bypass closure)

- Closed the next TODO item under `P1 -> Workflow Engine`:
  - removed remaining legacy bypass flow in review transitions.
- Updated `app/actions.ts` transition paths:
  - `bulkReviewDocumentsAction(...)` now routes approvals/rejections through `transitionDocumentState(...)` instead of direct status updates.
  - `resubmitDocumentAction(...)` now routes through workflow state (`CLARIFICATION -> RESUBMITTED`) with rule checks.
  - `setDocumentStatusAction(...)` remains wired through workflow-state service path.
- Kept dual logging intact:
  - `document_states` transition history
  - `document_activity_logs` + `activity_logs`
- Verified compile/build:
  - `npm run build` passed.

Next item in strict P1 order:

- Start `Project -> Credit Mapping`:
  - introduce/verify `project_credits` instance table
  - auto-seed credits on project creation
  - bind project credits in API + UI.

## Latest execution pass (2026-04-30, P0 requirement closure)

- Closed final pending P0 checklist item under `P0 Backend Workflow (W1)`:
  - confirmed `setDocumentStatusAction`, `bulkReviewDocumentsAction`, and `resubmitDocumentAction` now route transitions through `transitionDocumentState(...)`.
  - confirmed no direct `from("documents").update(...)` status writes remain in those W1 transition paths.
- Updated `todo.md`:
  - marked `Remaining for W1` as complete.

P0 status:

- All currently listed P0 items are complete.

## Latest execution pass (2026-04-30, P1 RBAC Enforcement & V2.2 Token Ledger Strictness)

- Closed P1 Section 5: RBAC Enforcement
  - Verified `canUploadProjectDocuments` and `canEditOwnDocumentBeforeFinalApproval` in `app/actions.ts` and `app/documents/page.tsx`
  - Fixed tests in `tests/rbac-matrix.spec.ts` to ensure the L1/L2 access restrictions are correctly applied.
- Closed V2.2: Token ledger strictness
  - Created atomic RPC `insert_document_and_consume_tokens` to combine document insertion and token consumption inside a single transaction.
  - Updated `app/actions.ts` `uploadDocumentAction` to use this new RPC, eliminating race conditions or out-of-sync tokens on file uploads.
- Verified compile/build:
  - `npm run build` passed.

Next item in strict P1 order:

- Complete `V2.3 Review decoupling completion`:
  - Wire all review actions to dedicated review records (`reviews` / `document_reviews`) with multi-cycle tracking.
