# Developer Handoff Document – Tracknov (MVP)

## 1. Objective
Build a workflow-driven IGBC project management system where:

Project -> Credit -> Document -> Review -> Decision

System must be:
- Deterministic (no invalid states)
- Role-controlled
- Fully traceable
- End-to-end functional

---

## 2. Core Architecture

### Entities
- Clients
- Projects
- Credits (Master)
- Project_Credits (Instance)
- Documents
- Reviews
- Users / Roles
- Token Ledger
- Activity Logs
- Document States (Workflow Engine)

---

## 3. P1 – CORE IMPLEMENTATION (MANDATORY)

### 3.1 Workflow Engine (Critical)

#### Objective
Enforce strict state machine at DB + API level.

#### States
DRAFT -> READY -> SUBMITTED -> UNDER_REVIEW -> CLARIFICATION -> RESUBMITTED -> APPROVED / REJECTED

#### DB
- Enum: `workflow_state`
- Table: `document_states`
  - `document_id`
  - `state`
  - `previous_state`
  - `transition_by`
  - `updated_at`

#### API
Function:
`transitionDocumentState(document_id, new_state, user_id)`

#### Rules
- No skipping states
- Validate transitions strictly
- Reject invalid transitions

#### Locking
| State | Edit |
|------|------|
| DRAFT | Yes |
| READY | Yes |
| SUBMITTED | No |
| UNDER_REVIEW | No |
| CLARIFICATION | Yes |
| RESUBMITTED | No |

#### Expected Outcome
- No invalid transitions
- Full state history available

---

### 3.2 Project ↔ Credit Mapping

#### Objective
Each project must have its own credit set.

#### DB
- `credits` (master)
- `project_credits` (project-specific)

#### Logic
- On project creation:
  - auto-generate `project_credits` from `credits`

#### UI
- List all credits per project
- Show status

#### Expected Outcome
- No missing credits
- Project-specific tracking

---

### 3.3 Document ↔ Credit Linkage

#### Objective
Every document must belong to a credit.

#### Required Fields
- `project_id`
- `project_credit_id`
- `document_type`

#### Versioning
- `version++`
- `is_latest` flag
- `parent_document_id`

#### Validation
- Reject upload if mapping missing

#### Expected Outcome
- No orphan documents
- Full traceability

---

### 3.4 Review Workflow

#### Objective
Enable approval / rejection lifecycle.

#### Actions
- Approve -> APPROVED
- Reject -> CLARIFICATION / REJECTED (remarks mandatory)

#### Loop
CLARIFICATION -> RESUBMITTED -> UNDER_REVIEW

#### Restrictions
- Only L3 can approve/reject

#### Expected Outcome
- Controlled review lifecycle

---

### 3.5 RBAC (Role-Based Access Control)

#### Roles
- L5: Super Admin
- L3: Project Admin
- L2: Client (Read-only)
- L1: Project Owner
- L0: Execution Team

#### Rules
- L0 -> upload only
- L1 -> assign/review
- L2 -> read-only
- L3 -> approve/reject
- L5 -> override

#### Enforcement
- API level (mandatory)
- UI level (secondary)

#### Expected Outcome
- No unauthorized actions

---

## 4. P2 – STABILITY LAYER

### 4.1 Dashboard

#### Metrics
- Credit counts per state
- Progress %
- Risk flags

#### Risk Rules
- RED -> mandatory rejected
- AMBER -> clarification-heavy
- GREEN -> stable

#### Expected Outcome
- Accurate visibility

---

### 4.2 Export System

#### Rules
- Include only:
  - APPROVED
  - `is_latest = true`

#### Outputs
- XLSX
- PDF
- ZIP

#### Validation
- Block export if mandatory incomplete

#### Expected Outcome
- Submission-ready output

---

### 4.3 Audit Logs

#### Table
`activity_logs`:
- `entity_type`
- `entity_id`
- `action`
- `performed_by`
- `timestamp`

#### Events
- upload
- review
- state transition
- export

#### Expected Outcome
- Full audit trail

---

## 5. Non-Negotiable Rules

- All logic must be enforced at API level
- No direct DB manipulation
- No UI-only validation
- Every action must be logged
- No silent failures

---

## 6. Acceptance Criteria (MVP)

System must support:

1. Create project
2. Auto-generate credits
3. Upload documents (linked to credits)
4. Move through workflow states
5. Approve/reject documents
6. Generate export
7. Maintain audit logs

---

## 7. Failure Conditions

- Invalid state transitions allowed
- Documents without credit mapping
- Unauthorized actions possible
- Export includes invalid documents
- Missing logs

---

## 8. Final Outcome

After implementation, Tracknov becomes:
- Workflow-driven
- Audit-compliant
- Role-secured
- Scalable

---

## 9. Execution Order

1. Workflow Engine
2. Credit Mapping
3. Document Linkage
4. Review Workflow
5. RBAC
6. Dashboard
7. Export
8. Logs

---

## 10. Delivery Rule

No feature is considered complete unless:
- It passes validation
- It follows workflow rules
- It is fully traceable
