# AUDITOR_DEVELOPER_HANDOFF.md

# TRACKNOV - AUDITOR TO DEVELOPER FINAL HANDOFF

Version: Final
Status: Mandatory Implementation Baseline
Project: Tracknov
System Type: Certification Enforcement Engine

---

# 1. CORE NON-NEGOTIABLE PRINCIPLE

Tracknov is:

* NOT a dashboard product
* NOT a generic SaaS
* NOT a document upload platform

Tracknov IS:

> A certification-grade compliance and workflow enforcement engine.

Every implementation decision must prioritize:

1. Validation integrity
2. Workflow integrity
3. Audit traceability
4. Certification correctness
5. Role-controlled execution

UI convenience is secondary.

---

# 2. ASSUMPTION POLICY (MANDATORY)

Assumptions are strictly forbidden.

If:

* any workflow behavior,
* validation rule,
* lifecycle action,
* permission,
* state transition,
* approval logic,
* scoring rule,
* rejection behavior,
* assignment behavior,
* audit expectation,
* or UI interaction

is not explicitly documented:

Developer MUST:

* stop implementation
* raise clarification request
* obtain written confirmation

Forbidden:

* guessing
* "industry standard" assumptions
* inferred logic
* silent implementation decisions
* convenience shortcuts

---

# 3. FINAL WORKFLOW HIERARCHY

## Roles

| Role | Responsibility                                   |
| ---- | ------------------------------------------------ |
| L5   | System governance                                |
| L3   | Final validation + stage submission              |
| L1   | Operational owner + assignment + internal review |
| L0   | Execution/upload                                 |
| L2   | Read-only/client visibility                      |

---

# 4. FINAL EXECUTION FLOW

```text
L1 assigns
-> L0 uploads
-> L1 reviews
-> L3 validates
-> workflow transition
-> stage submission
```

This workflow is frozen.

No alternate flow allowed.

---

# 5. PROJECT ONBOARDING FLOW

## Step 1

Client pays for project.

## Step 2

Super User (L5) creates project.

## Step 3

System generates:

* unique project code
* unique project ID

## Step 4

Users join project using project code.

Allowed users:

* L3 Project Admin
* L1 Project Owner
* L0 Contributors
* L2 Client

## Step 5

System maps role according to login hierarchy.

Users cannot self-promote roles.

---

# 6. PROJECT STAGES (FROZEN)

Only 3 stages exist:

1. Design
2. Construction
3. Handover

No additional stages allowed unless explicitly approved.

---

# 7. CREDIT STRUCTURE (FROZEN)

```text
Project
-> Credits
-> Credit Stage
-> Submittals
-> Documents
```

Definitions:

| Entity       | Purpose                  |
| ------------ | ------------------------ |
| Credit       | Compliance objective     |
| Credit Stage | Stage-specific lifecycle |
| Submittal    | Workflow control unit    |
| Document     | Evidence layer           |

Submittal is the workflow layer.
Document is only evidence.

---

# 8. ASSIGNMENT ENGINE (MANDATORY)

## Ownership

L1 = Primary assigner
L3 = Backup/override assigner

---

## Assignment Rules

### Mandatory:

* every submittal/document type must have assigned L0 owner
* one active assignee only
* assignment required before upload

### Forbidden:

* upload without assignment
* multiple active assignees
* L0 self-assignment

---

## Override Rules

L3 may override assignment only when:

* assignment missing
* assignment incorrect
* workflow blocked

Every override MUST log:

* old assignee
* new assignee
* reason
* timestamp
* actor

---

# 9. DOCUMENT WORKFLOW

## Upload Flow

```text
Assignment
-> Upload
-> L1 Review
-> L3 Validation
```

---

## Review Outcomes

### A. Approved

Document proceeds.

### B. Rejected

Document returns to L0.
Reason mandatory.

### C. Clarification

Document returns to L0.
Reason mandatory.

---

# 10. REJECTION POLICY (FROZEN)

## Rule

Each document:

* gets 1 resubmission attempt only

---

## Final Behavior

### First rejection:

Allowed:

* 1 resubmission

### Second rejection:

System MUST:

* permanently eliminate ONLY that document from workflow

System MUST NOT:

* block entire submittal
* block entire credit
* auto-fail project

---

## Required Behavior After Elimination

System must:

* mark document as ELIMINATED
* preserve audit history
* remove from active queue
* exclude from pending workflow counts

Audit history must remain immutable.

---

# 11. VALIDATION ENGINE (CENTRAL AUTHORITY)

Validation engine is the final authority.

Workflow engine cannot bypass validation.

---

## Validation Required At

1. Upload
2. Mapping
3. Review
4. Approval
5. Credit completion
6. Stage submission
7. Project submission

---

## Validation Must Check

* assignment ownership
* role authorization
* document type match
* mandatory submittals
* workflow state
* duplicate detection
* version integrity
* mapping correctness

---

## Forbidden

* direct approval
* workflow bypass
* UI-based validation
* AI-based approval

---

# 12. WORKFLOW ENGINE RULES

## Workflow States

```text
DRAFT
READY
SUBMITTED
UNDER_REVIEW
CLARIFICATION
RESUBMITTED
APPROVED
REJECTED
ELIMINATED
```

---

## Transition Rules

Transitions must:

* be backend-controlled
* be role validated
* be assignment validated
* be audit logged
* pass validation engine

---

## Forbidden

Direct state mutation forbidden.

Forbidden example:

```sql
UPDATE submittals SET state='APPROVED'
```

Only allowed path:

```text
API
-> Workflow Engine
-> Validation
-> Audit
-> Transition
```

---

# 13. DERIVED STATE ENGINE (MANDATORY)

System must automatically derive:

```text
submittal
-> credit stage
-> credit
-> project
```

No manual status updates allowed.

---

## Forbidden

```sql
UPDATE project_status='READY'
```

All derived states must be recalculated automatically.

---

# 14. DOCUMENT VERSIONING

Documents are immutable.

Every revision creates:

* new document version

---

## Forbidden

* overwriting files
* replacing document URLs
* deleting history

---

# 15. AI COPILOT RULES

AI is advisory only.

AI may:

* summarize
* explain
* recommend
* highlight risks
* suggest actions

AI may NEVER:

* approve
* reject
* transition workflow
* override validation
* change state

---

## Missing Data Rule

If data unavailable:

System must respond:

```text
I cannot confirm this from your project data.
```

No guessing allowed.

---

# 16. PROJECT ADMIN (L3) UX - FINAL EXPECTATION

## Daily Flow

```text
Login
-> Daily Summary
-> Validation Queue
-> Review Screen
-> Continuous validation loop
```

---

## Mandatory UX Features

### Daily Summary

Must show:

* priorities
* blockers
* pending validations
* stage readiness

---

### Global Validation Queue

Must include:

* all projects
* priority sorting
* impact visibility
* filters

---

### Review Screen

Must include:

* document viewer
* cross-document references
* AI summary panel
* compliance checks
* credit progress widget

---

## Forbidden UX Behaviors

* deep navigation
* searching for work manually
* multiple screen hops
* page reload review flow

---

# 17. AUDIT LOGGING (MANDATORY)

Every critical action must log:

* actor
* timestamp
* entity
* previous state
* new state
* reason

---

## Immutable Tables

Append-only enforcement required:

* audit_logs
* workflow_history
* document_versions
* override_logs
* assignment_logs

UPDATE and DELETE forbidden.

---

# 18. DATABASE REQUIREMENTS

Mandatory enforcement:

* ENUMs
* FK constraints
* UNIQUE constraints
* assignment integrity
* version integrity
* RLS
* transition protection
* derived state recalculation

---

# 19. RLS REQUIREMENTS

All project data must enforce:

* project isolation
* membership validation
* role validation

Unauthorized access forbidden.

---

# 20. API GOVERNANCE

Every API must:

1. authenticate
2. authorize
3. validate
4. audit
5. execute
6. recalculate derived states

---

## Forbidden

* direct frontend DB writes
* bypass validation
* bypass workflow
* bypass audit logging

---

# 21. FRONTEND GOVERNANCE

Frontend responsibilities:

* render
* display
* trigger APIs

Frontend forbidden responsibilities:

* workflow decisions
* scoring
* validation
* certification logic
* state transitions

---

# 22. PERFORMANCE TARGETS

| Function               | Target   |
| ---------------------- | -------- |
| Queue load             | <2 sec   |
| Document switch        | <0.5 sec |
| AI response            | <3 sec   |
| Deterministic response | <300 ms  |

---

# 23. QA MANDATORY TESTS

System must prove:

* invalid transitions blocked
* unauthorized approvals blocked
* upload without assignment blocked
* duplicate assignee blocked
* direct state mutation impossible
* audit immutability enforced
* derived state recalculation accurate
* AI cannot modify workflow
* eliminated document removed from workflow

---

# 24. PRODUCTION BLOCKERS

Production deployment forbidden if any exist:

* workflow bypass
* missing audit chain
* mutable logs
* mutable versions
* missing derived states
* validation bypass
* direct UI DB writes
* role bypass
* assignment bypass

---

# 25. FINAL IMPLEMENTATION ORDER (MANDATORY)

Development order:

```text
Schema
-> Constraints
-> Validation
-> Workflow
-> APIs
-> UI
-> AI
```

Forbidden:

```text
UI first
Backend later
```

---

# 26. FINAL ENGINEERING RULE

Tracknov must always behave like:

```text
Compliance Engine First
SaaS Second
```

Never the opposite.

---

# 27. FINAL DEVELOPER INSTRUCTION

If any requirement:

* appears unclear
* partially defined
* ambiguous
* operationally uncertain
* technically conflicting

Developer MUST:

* stop implementation
* request clarification
* obtain confirmation before coding

Silent assumptions are treated as implementation violations.

---

END OF DOCUMENT
