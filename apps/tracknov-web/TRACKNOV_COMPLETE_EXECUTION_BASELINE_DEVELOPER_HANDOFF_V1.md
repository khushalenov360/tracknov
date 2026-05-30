# TRACKNOV — COMPLETE EXECUTION BASELINE DEVELOPER HANDOFF V1

## PURPOSE

This document is the SINGLE authoritative implementation baseline for Tracknov.

This baseline becomes:
THE IMPLEMENTATION LAW

---

# SECTION 1 — PURPOSE + SYSTEM FREEZE

## SYSTEM PURPOSE

Tracknov is:
A compliance-grade certification execution platform

Primary objectives:
- Deterministic certification workflows
- Validation-controlled execution
- Immutable audit traceability
- RBAC-safe project isolation
- Runtime-safe orchestration
- Certification-grade evidence lineage

## V1 INCLUDED SCOPE

- IGBC execution workflows
- Credit → Stage → Submittal hierarchy
- Validation-driven progression
- Queue-first review UX
- RBAC enforcement
- Immutable audit logging
- Derived state engine
- AI copilot assistance (non-authoritative)

## CORE SYSTEM LAW

Validation controls decisions
Workflow controls lifecycle
RBAC controls authority
Audit controls traceability
AI assists only

## PRIMARY EXECUTION UNIT

Tracknov executes ONLY at:
Submittal level

Hierarchy:
Project
→ Credit
→ Stage
→ Submittal
→ Document

## WORKFLOW STATES

DRAFT
READY
SUBMITTED
UNDER_REVIEW
CLARIFICATION
RESUBMITTED
APPROVED
REJECTED

## ROLE MODEL

L0 = Contributor
L1 = Project Owner
L2 = Client (read-only)
L3 = Project Admin
L5 = System Admin

## AUTHORITATIVE EXECUTION FLOW

Frontend
→ API
→ Orchestrator
→ Validation Engine
→ Workflow Engine
→ Audit Engine
→ Derived State Engine
→ DB Commit
→ Response
→ Frontend Render

---

# SECTION 2 — CANONICAL DATABASE MODEL

## CORE TABLES

- users
- projects
- project_users
- project_credits
- credit_stages
- submittals
- documents
- document_versions
- document_mappings
- workflow_history
- validation_results
- audit_logs
- override_logs

## DATABASE LAW

Database is authoritative certification state.

## DOCUMENT VERSION LAW

Every upload creates immutable document_version.

Overwriting forbidden.

## AUDIT LAW

Audit tables are append-only.

## DERIVED STATE LAW

ONLY Derived State Engine may update:
- readiness_state
- earned_points
- certification_level
- completion_percentage

## PROJECT ISOLATION LAW

Every project-scoped entity MUST resolve to:
project_id

RLS mandatory everywhere.

---

# SECTION 3 — ORCHESTRATION + API AUTHORITY MODEL

## REQUIRED EXECUTION ORDER

authenticate
→ membership validation
→ authorization
→ assignment validation
→ validation interception
→ workflow transition
→ audit logging
→ recalculation
→ commit
→ response

## TRANSACTION LAW

Sensitive operations MUST be atomic.

If ANY failure occurs:
rollback everything

## REQUIRED ENGINES

- Workflow Engine
- Validation Engine
- RBAC Engine
- Audit Engine
- Derived State Engine
- Queue Engine
- Copilot Engine

## CONFLICT RESPONSE

{
  "status": "conflict",
  "message": "Entity modified by another reviewer."
}

---

# SECTION 4 — VALIDATION + WORKFLOW ENFORCEMENT

## VALIDATION AUTHORITY

Validation engine controls:
- completeness
- eligibility
- scoring eligibility
- readiness eligibility
- certification eligibility

## VALIDATION ENTRY POINTS

Validation MUST execute during:
- upload
- mapping
- submission
- approval
- clarification
- resubmission
- scoring
- certification readiness

## STALE APPROVAL LAW

If evidence changes:
prior approvals become stale

and MUST re-enter validation.

## OVERRIDE LAW

ONLY L5 may override validation.

---

# SECTION 5 — DERIVED STATE + SCORING ENGINE

## DERIVED STATE PRINCIPLE

Derived states are computed, not manually editable.

## DERIVED STATE HIERARCHY

submittal
→ credit_stage
→ project_credit
→ project
→ certification

## SCORING LAW

Scoring MUST be:
- deterministic
- validation-backed
- immutable per snapshot
- audit-traceable

## READINESS LAW

Readiness is validation-derived only.

---

# SECTION 6 — RBAC + RLS RUNTIME ENFORCEMENT

## AUTHORIZATION FLOW

Identity
→ Membership
→ Capability
→ Workflow Context
→ Authorization

## ROLE CAPABILITIES

L0 = upload only
L1 = coordination + review
L2 = read-only
L3 = final validation
L5 = override/governance

## PROJECT ISOLATION LAW

Cross-project visibility forbidden.

## FORBIDDEN SECURITY PATTERNS

- frontend-only permission checks
- broad authenticated reads
- hidden endpoint trust
- AI authorization assumptions

---

# SECTION 7 — FRONTEND RUNTIME CONTRACT

## FRONTEND PRINCIPLE

Frontend is controlled execution interface.

NOT:
- workflow authority
- validation authority
- scoring authority

## REQUIRED PAYLOAD

{
  "workflow_state": "",
  "allowed_actions": [],
  "lock_state": {},
  "validation_status": {},
  "derived_metrics": {}
}

## QUEUE-FIRST UX LAW

Review
→ Action
→ Auto-load next item

## TRUST-INTEGRITY LAW

Operational users MUST NOT see:
- desync monitors
- runtime diagnostics
- reconciliation tooling
- infrastructure internals

---

# SECTION 8 — AI COPILOT RUNTIME CONTRACT

## AI PRINCIPLE

Tracknov AI is controlled conversational intelligence.

## AI MAY

- summarize
- explain
- recommend
- suggest mappings
- explain validation failures

## AI MAY NEVER

- approve
- reject
- transition workflow
- override RBAC
- override validation

## DETERMINISTIC-FIRST ROUTING

Rules
→ APIs
→ AI

If deterministic answer exists:
DO NOT use AI

## ANTI-HALLUCINATION LAW

If insufficient certainty:
I cannot confirm this from project data.

---

# SECTION 9 — ACCEPTANCE TEST MATRIX

## WORKFLOW TESTS

- DRAFT → READY allowed
- DRAFT → APPROVED blocked
- stale approval blocked
- unauthorized approval blocked

## VALIDATION TESTS

- missing evidence blocked
- invalid MIME blocked
- stale evidence revalidation
- missing validation blocked

## RBAC TESTS

- cross-project access blocked
- unauthorized review blocked
- stale membership blocked

## CONCURRENCY TESTS

- double approval race blocked
- stale mutation blocked
- conflicting reviewers conflict

## AI TESTS

- hallucination trap returns uncertainty
- prompt injection neutralized
- cross-project AI leakage blocked
- AI approval attempt blocked

---

# SECTION 10 — PRODUCTION RELEASE GATES

## RELEASE PRINCIPLE

Tracknov releases are governed by:
runtime proof, not conceptual completeness.

## ABSOLUTE PRODUCTION BLOCKERS

DO NOT DEPLOY if ANY exists:
- workflow bypass
- missing RLS
- mutable audit history
- mutable document versions
- frontend DB mutation
- AI authority leakage
- stale approvals
- cross-project leakage
- derived-state drift
- scoring drift
- validation bypass

## FINAL V1 SUCCESS DEFINITION

Tracknov V1 succeeds ONLY if:
- certification workflow deterministic
- evidence lineage provable
- validation authoritative
- audit chain immutable
- RBAC isolation enforceable
- frontend non-authoritative
- AI safely governed
- runtime stable
- operational trust preserved

END OF HANDOFF
