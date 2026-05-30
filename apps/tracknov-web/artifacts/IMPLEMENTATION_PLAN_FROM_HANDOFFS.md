# Tracknov Implementation Plan (From Handoff Set)

Last updated: 2026-05-05  
Source set: `artifacts/handoff/*.md` (16 files)

## 1) Scope Baseline

This plan consolidates architecture, DB enforcement, API, UI, Copilot, billing, scoring, and RBAC requirements from the provided handoff files into one executable sequence.

## 2) Execution Order (Critical Path)

1. Platform guardrails (DB + RLS + RBAC)
2. Workflow/validation engine (DB-enforced transitions)
3. Project/Credit/Submittal data model hardening
4. API contract stabilization (Supabase-backed service layer)
5. Assignment-level enforcement
6. Credits/billing/token ledger reliability
7. Scoring/certification engine
8. Copilot intelligence + file analysis + mapping workflows
9. Project Admin UX and global UX/UI pass
10. Integration, UAT, release readiness

## 3) Work Packages

### WP-0: Platform Guardrails (P0)
- Implement/verify RLS policies from `plug-and-play Supabase RLS script.md`.
- Enforce role matrix from `ROLE-BASED ENFORCEMENT (DB LEVEL).md`.
- Ensure only allowed roles can mutate critical entities (projects, users, tokens, overrides).
- Deliverable: DB rejects unauthorized access independent of UI/API.

### WP-1: Validation & Workflow Engine (P0)
- Implement DB-enforced workflow transitions from:
  - `VALIDATION ENGINE (DB-ENFORCED).md`
  - `Validation_Engine.md`
- Add transition logs, previous-state tracking, actor tracking.
- Enforce no-skip transitions and role-aware transitions.
- Deliverable: deterministic state machine with audit trail.

### WP-2: Core IGBC Data Model (P0/P1)
- Align schema with:
  - `Tracknov_SQL_Final.md`
  - `IGBC_DB_API_Handoff.md`
  - `Master System Architecture.md`
- Normalize Project -> Credit -> Stage -> Submittal -> Document relationships.
- Ensure project instantiation always seeds credit/submittal structures.
- Deliverable: no orphan docs, no empty project trackers after instantiation.

### WP-3: API Contract + Integration Layer (P1)
- Stabilize API routes as per:
  - `Tracknov_Supabase_API_Handoff.md`
  - `Tracknov_Integration_Architecture.md`
- Standardize error payloads, idempotency, and server-side validation.
- Add explicit diagnostics for tracker import mismatches (unmatched codes list).
- Deliverable: predictable APIs for UI/Copilot/workflow actions.

### WP-4: Assignment-Level Enforcement (P1)
- Implement assignment ownership controls from `ASSIGNMENT-LEVEL ENFORCEMENT (DB).md`.
- Only assigned user can upload/update mapped evidence slots.
- Rejections route back to assigned owner by default.
- Deliverable: accountable document ownership model.

### WP-5: Credits Billing & Ledger (P1)
- Implement/verify from `credits billing handoff.md`:
  - atomic debit/refund
  - idempotent transaction keys
  - ledger-first reconciliation
- Deliverable: no token leakage on failed/retried uploads.

### WP-6: Scoring & Certification Engine (P1)
- Implement rule-driven scoring from `Scoring_Certification_Engine.md`.
- Mandatory-credit gating + threshold-based certification outputs.
- Stage-aware/provisional vs final scoring.
- Deliverable: certification status is computed, not manual.

### WP-7: Copilot + Universal Certification Intelligence (P1)
- Implement from `AI Copilot + Universal Certification Engine.md`:
  - file analysis responses (type, key points, likely credit matches)
  - guidebook-aware credit guidance
  - conversation-led mapping/upload flow
- Remove rigid/non-context fallback behavior.
- Deliverable: Copilot handles natural conversational workflows reliably.

### WP-8: Project Admin + UX/UI Delivery (P1)
- Build role-specific UX from:
  - `TRACKNOV_Project_Admin_UI_Handoff.md`
  - `UXUI dev handoff.md`
- Ensure clean role rendering and remove dead controls.
- Ensure admin-only controls for guidebook/tracker management.
- Deliverable: predictable role-first UI (L0-L5).

### WP-9: Release Verification (P1/P2)
- E2E flows:
  1. Create project -> instantiate -> upload guidebook -> import tracker
  2. Copilot analyze -> suggest mapping -> upload -> workflow state progress
  3. Review/reject/resubmit loops
  4. Billing/token reconciliation
  5. Scoring and export gating
- Deliverable: UAT signoff matrix + release checklist.

## 4) Dependencies

- WP-1 depends on WP-0.
- WP-2 depends on WP-1 for state fields and transition logging.
- WP-4/WP-5/WP-6 depend on WP-2 model consistency.
- WP-7 depends on WP-3 APIs + WP-2/6 data integrity.
- WP-8 depends on WP-3 and WP-7.
- WP-9 depends on all prior packages.

## 5) Suggested Sprint Split

### Sprint A (P0 hardening)
- WP-0, WP-1, WP-2

### Sprint B (P1 backend)
- WP-3, WP-4, WP-5, WP-6

### Sprint C (P1 product experience)
- WP-7, WP-8

### Sprint D (stabilization)
- WP-9 + performance/ops fixes

## 6) Acceptance Criteria

- DB-level role/workflow enforcement blocks invalid transitions and unauthorized writes.
- Tracker import produces mapped project credits (or actionable unmatched diagnostics).
- Copilot can analyze attached files and suggest likely credits with rationale.
- Chat-driven map/upload works end-to-end without manual fallback buttons.
- Billing ledger remains consistent under retries/failures.
- Certification score/status is system-derived and reproducible.

