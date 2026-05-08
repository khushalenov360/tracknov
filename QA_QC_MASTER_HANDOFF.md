# Tracknov QA/QC Master Handoff

Last updated: 2026-05-01 (IST)  
Audience: QA/QC Testing Engineer  
Purpose: Single reference to validate implementation against all handoff files.

---

## 1) Source Handoffs Consolidated

This test handoff compiles requirements from:

- [AgentHandoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/AgentHandoff.md)
- [Ai developerhandoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/Ai%20developerhandoff.md)
- [DEVELOPER_HANDOFF_MVP.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/DEVELOPER_HANDOFF_MVP.md)
- [Workflow_Engine_Developer_Handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/Workflow_Engine_Developer_Handoff.md)
- [Documents_Engine_Developer_Handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/Documents_Engine_Developer_Handoff.md)
- [Credits_Engine_Developer_Handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/Credits_Engine_Developer_Handoff.md)
- [TokenEngine_Developer_Handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/TokenEngine_Developer_Handoff.md)
- [users_developerhandoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/users_developerhandoff.md)
- [UX_UI_developer_handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/UX_UI_developer_handoff.md)
- [IGBC_Developer_Handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/IGBC_Developer_Handoff.md)
- [SAASsales_Developer_Handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/SAASsales_Developer_Handoff.md)
- [MEPCON_Developer_Handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/MEPCON_Developer_Handoff.md)
- [Architect_Developer_Handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/Architect_Developer_Handoff.md)
- [Contractor_Developer_Handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/Contractor_Developer_Handoff.md)
- [ProjectOwner_Developer_Handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/ProjectOwner_Developer_Handoff.md)
- [ProjectAdmin_Developer_Handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/ProjectAdmin_Developer_Handoff.md)
- [Client_Developer_Handoff.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/Client_Developer_Handoff.md)
- [Client_Developer_Handoff_Refined.md](C:/Users/91922/Documents/Codex/2026-04-23-can-you-read-https-github-com/harita/Client_Developer_Handoff_Refined.md)

---

## 2) Product Contract for QA

Tracknov is expected to operate as:

1. Workflow-driven IGBC execution platform
2. Role-controlled system (L0 to L5)
3. Audit-safe document and token engine
4. Stage-aware certification flow (Design/Construction)
5. Decision-oriented dashboards for L1/L2/L3/L5

Primary workflow:

`Project -> Credit -> Document -> Review -> Decision -> Submission Pack`

---

## 3) Environment & Preconditions

1. Test against latest `main` branch.
2. Supabase project configured and reachable.
3. Test users available for all roles:
   - L0: `architect`, `mep`, `contractor`
   - L1: `owner`
   - L2: `client`
   - L3: `project_admin`
   - L5: `super_user`
4. At least 2 active projects with seeded credits.
5. Storage bucket `project-documents` available.

---

## 4) Critical Workflow State Machine Tests

Target states:

`DRAFT -> READY -> SUBMITTED -> UNDER_REVIEW -> CLARIFICATION -> RESUBMITTED -> APPROVED/REJECTED`

### WSM-01 Valid transition enforcement
- Try every allowed transition.
- Expected: success + logged transition.

### WSM-02 Invalid skip blocking
- Attempt invalid jumps (example: `READY -> APPROVED`).
- Expected: rejected by backend with explicit error.

### WSM-03 Role gating
- L0 cannot approve/reject.
- L1 cannot do final approval override.
- L3/L5 can execute authorized review transitions.
- Expected: unauthorized transitions blocked.

### WSM-04 Edit lock by state
- Verify document metadata edits:
  - editable: `DRAFT`, `READY`, `CLARIFICATION`
  - locked: `SUBMITTED`, `UNDER_REVIEW`, `RESUBMITTED`, `APPROVED`
- Expected: API and UI both enforce lock.

### WSM-05 Transition logging
- Every state change creates:
  - `document_states` record
  - activity/audit entry
- Expected: no missing transition logs.

---

## 5) Document Engine Tests

### DOC-01 Mandatory linkage
- Upload without `project_id`, `project_credit_id`, or `document_type`.
- Expected: reject upload.

### DOC-02 Version lineage
- Re-upload same logical document.
- Expected:
  - version increments
  - previous row `is_latest=false`
  - parent/lineage trace retained

### DOC-03 Duplicate/suspicious protection
- Upload likely duplicate filename/hash.
- Expected: warning/safeguard path shown.

### DOC-04 Delete-before-review refund
- Delete an unreviewed upload.
- Expected: token refund transaction recorded.

### DOC-05 Preview-open behavior
- Document row hyperlink opens secure file in new tab (except restricted client mode).
- Expected: opens for permitted roles only.

---

## 6) Review Workflow Tests (L1 + L3)

### REV-01 Owner queue integrity
- Verify `SUBMITTED` items appear in owner queue.

### REV-02 Admin queue integrity
- Verify `UNDER_REVIEW` items appear in Project Admin queue.

### REV-03 Rejection quality rules
- Reject requires remark and reason type.
- Expected: generic empty rejection not accepted.

### REV-04 Clarification-resubmission loop
- Reject to clarification, then resubmit.
- Expected lifecycle:
  - `UNDER_REVIEW -> CLARIFICATION -> RESUBMITTED -> UNDER_REVIEW`

### REV-05 Bulk actions
- L1/L3 bulk approve/send-back on selected docs.
- Expected: correct transition + complete logs.

---

## 7) Credits & Project Mapping Tests

### CRD-01 Project credit instancing
- On project create, `project_credits` rows auto-created.

### CRD-02 Required evidence matrix
- Verify per-credit required doc types visible and enforced.

### CRD-03 Credit completion dependency
- Credit cannot move complete/approved if required evidence unresolved.

### PRJ-01 Project completion dependency
- Project cannot complete unless all required credits closed per rules.

---

## 8) IGBC Stage Engine Tests

### IGBC-01 Design/Construction separation
- Validate stage-aware credit/submittal handling.

### IGBC-02 Inheritance traceability
- Design-approved artifacts carried to construction with reference trace.

### IGBC-03 Scoring API
- Test: `/api/projects/[id]/igbc-score`
- Verify:
  - mandatory counts
  - stage scores
  - projected rating output

### IGBC-04 Submission structure
- ZIP export includes expected stage-wise/credit-wise organization and latest approved docs only.

---

## 9) Token Engine & Billing Tests

### TOK-01 Atomic deduction
- Successful upload deducts exactly 1 token.
- Failed upload does not deduct token.

### TOK-02 Ledger integrity
- Every debit/credit visible in transaction ledger.

### TOK-03 Wallet visibility
- Project admin/super user can view load/usage/remaining.

### TOK-04 Reconciliation
- Super-user reconciliation panel flags anomalies accurately.

---

## 10) RBAC and Data Isolation Tests

### RBAC-01 API-first enforcement
- Attempt restricted actions via API even if UI hidden.
- Expected: backend rejects unauthorized role.

### RBAC-02 Client restricted mode
- In client mode, verify no internal review details exposed in document workspace.

### RBAC-03 Project isolation
- User from project A cannot view/edit project B records.

### RBAC-04 Super user overrides
- Verify override actions are role-limited and audit-logged.

---

## 11) Role-wise UAT Matrix (L0-L5)

### L0 (MEP / Architect / Contractor)
- Assigned-scope view only
- Upload mobile-friendly flow
- Rejection guidance + resubmit
- Pre-review correction

### L1 (Project Owner)
- Cross-project owner dashboard
- Review queue, preview, approve/send-back
- Bulk review actions

### L2 (Client)
- Read-only executive dashboard
- Risk, progress, token runway
- No deep internal review leak

### L3 (Project Admin)
- High-speed validation queue
- Rejection templates
- Submission readiness controls

### L5 (Super User)
- Command center
- Wallet/load/override controls
- Health and anomaly visibility

---

## 12) Sales Enablement Tests

### SALES-01 ROI engine
- Verify ROI cards and assumptions-driven output.

### SALES-02 Executive sales dashboard API
- Test: `/api/sales/executive`

### SALES-03 Demo mode
- Test `/demo` visibility only for authorized roles.
- Toggle + reset behavior validated.

### SALES-04 Case-study generator
- Test `/api/sales/case-study/[projectId]`
- Validate JSON response + downloadable report path.

---

## 13) API Smoke Checklist

Must return successful and role-safe responses:

1. `/api/projects/[id]/lifecycle-summary`
2. `/api/projects/[id]/igbc-score`
3. `/api/projects/[id]/tracker`
4. `/api/projects/[id]/summary`
5. `/api/projects/[id]/submission-pack`
6. `/api/sales/executive`
7. `/api/sales/case-study/[projectId]`
8. `/api/jobs/notifications/digest` (authorized roles only)

---

## 14) Performance & Reliability Targets

1. Dashboard load target: < 2s on warm path
2. Core API target: low-latency and stable responses
3. Upload flow:
   - no silent failures
   - user-visible success/failure state
4. No blocking runtime exceptions across key flows:
   - login
   - dashboard
   - projects
   - documents
   - review queue

---

## 15) Evidence Capture Format (for QA report)

For each test case, capture:

1. Test ID
2. Role used
3. Steps
4. Expected result
5. Actual result
6. Screenshot / video
7. API payload/response (if relevant)
8. DB/audit proof (if relevant)
9. Status: Pass / Fail / Blocked
10. Defect link (if failed)

---

## 16) Release Gate (Pass Criteria)

Release candidate passes QA only if:

1. No critical RBAC breach
2. No invalid workflow transition possible
3. Token debit/refund accuracy is verified
4. Submission pack export integrity verified
5. Role-wise UAT matrix signed off
6. Audit trail completeness confirmed

---

## 17) Known Remaining Manual Items (from TODO)

QA team should explicitly execute and sign off:

1. End-to-end live workflow with real role accounts/data
2. Production migration verification (including activity log migration)
3. Deployed environment smoke tests
4. Mobile QA pass
5. Copilot validation on all tabs with live project context
6. Final tracker/PDF/ZIP naming/structure validation against CCIL/IGBC expectation

---

## 18) Notes for QA Engineer

1. Prefer backend/API truth over UI assumptions.
2. Treat silent success without ledger/audit entries as failure.
3. Any role seeing data outside assigned scope is a critical defect.
4. If transition path works in UI but fails via direct API rules, prioritize API rule correctness.

