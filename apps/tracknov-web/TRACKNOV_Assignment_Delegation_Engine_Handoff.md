# TRACKNOV — ASSIGNMENT & DELEGATION ENGINE DEVELOPER HANDOFF

# OBJECTIVE

Implement the missing:
- Assignment authority model
- Delegation lifecycle
- Accountability chain
- Task orchestration
- Assignment auditability
- Queue integration

aligned with frozen governance.

---

# GOVERNANCE FREEZE

## Authority Hierarchy

| Role | Responsibility |
|---|---|
| L3 | Workflow authority owner |
| L1 | Execution coordinator |
| L0 | Execution contributor |

---

# FINAL AUTHORITY RULE

## L3 Project Admin

May:
- assign credits
- assign submittals
- assign document responsibilities
- reassign ownership
- approve/reject
- trigger clarifications

## L1 Project Manager

May:
- receive assignments from L3
- delegate execution to L0
- monitor contributor progress
- coordinate uploads

May NOT:
- bypass validation
- override workflow
- approve final submissions

## L0 Contributors

May:
- upload evidence
- respond to clarifications
- update assigned tasks

May NOT:
- assign/reassign others
- approve/reject
- modify workflow state directly

---

# CORE GOVERNANCE PRINCIPLE

delegation ≠ accountability transfer

If L1 delegates:
- accountability still remains with L1

---

# CURRENT GAP

Current implementation supports:
- dropdown assignment selection

BUT DOES NOT SUPPORT:
- delegation lineage
- accountability ownership
- assignment audit trail
- task orchestration
- queue routing
- assignment lifecycle enforcement

---

# TARGET ARCHITECTURE

L3
→ assigns work
→ L1 or L0

L1
→ optionally delegates
→ L0

L0
→ executes upload/rework

Validation
→ routed back through workflow

---

# REQUIRED DATABASE CHANGES

## TASKS TABLE

```sql
CREATE TABLE tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id uuid NOT NULL,
    project_credit_id uuid,
    submittal_id uuid,

    task_type text NOT NULL,

    assigned_by uuid NOT NULL,
    assigned_to uuid NOT NULL,

    delegated_by uuid,
    delegated_from uuid,

    accountable_user_id uuid NOT NULL,

    workflow_state workflow_state NOT NULL DEFAULT 'DRAFT',

    priority text NOT NULL DEFAULT 'MEDIUM',

    due_date timestamptz,

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    active_flag boolean DEFAULT true
);
```

## TASK HISTORY TABLE

```sql
CREATE TABLE task_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    task_id uuid NOT NULL,

    action_type text NOT NULL,

    performed_by uuid NOT NULL,

    old_state text,
    new_state text,

    old_assignee uuid,
    new_assignee uuid,

    notes text,

    created_at timestamptz DEFAULT now()
);
```

---

# REQUIRED ENUMS

```sql
CREATE TYPE task_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);
```

```sql
CREATE TYPE task_state AS ENUM (
    'ASSIGNED',
    'DELEGATED',
    'IN_PROGRESS',
    'UPLOADED',
    'UNDER_REVIEW',
    'CLARIFICATION',
    'APPROVED',
    'REJECTED'
);
```

---

# API CONTRACTS

## CREATE TASK

```http
POST /tasks/create
```

## DELEGATE TASK

```http
POST /tasks/:id/delegate
```

## UPDATE TASK STATE

```http
POST /tasks/:id/state
```

## GET MY TASKS

```http
GET /tasks/my
```

---

# REQUIRED BACKEND FLOW

## CASE 1 — L3 ASSIGNS TASK

L3
→ Create task
→ Queue routing
→ Notification
→ Audit log
→ Dashboard refresh

## CASE 2 — L1 DELEGATES

L1
→ Delegate
→ Create delegation history
→ Update queue ownership
→ Preserve accountability

## CASE 3 — L0 UPLOADS

L0
→ Upload evidence
→ Task moves to UPLOADED
→ Validation queue updated
→ L1 + L3 notified

---

# REQUIRED QUEUE ENGINE BEHAVIOR

Queues must be:
- role aware
- assignment aware
- priority aware
- workflow aware

Priority order:
1. Clarifications
2. Rejections
3. Mandatory credits
4. Overdue tasks
5. Normal tasks

---

# REQUIRED UI CHANGES

## ASSIGNMENT DROPDOWN

Must:
- separate L1 and L0 visually
- show role labels
- prevent invalid selection

## TASK DETAIL PANEL

Must show:
- assigned by
- assigned to
- accountable owner
- delegation lineage
- workflow state
- due date
- audit trail

---

# REQUIRED TEST CASES

## RBAC TESTS

- L0 cannot assign
- L1 cannot approve
- L1 cannot delegate upward
- unauthorized users blocked

## WORKFLOW TESTS

- invalid transitions blocked
- reassignment logged
- stale updates rejected

## CONCURRENCY TESTS

- simultaneous assignment conflict
- simultaneous approval conflict
- stale state rejection

---

# PRODUCTION BLOCKERS

DO NOT DEPLOY if ANY exists:
- task ownership drift
- missing audit logs
- untracked delegation
- frontend-derived permissions
- direct DB mutations
- orphan uploads
- invalid workflow transitions

---

# ACCEPTANCE CRITERIA

| Requirement | Mandatory |
|---|---|
| L3 assignment authority enforced | ✅ |
| L1 delegation enforced | ✅ |
| L0 execution-only enforced | ✅ |
| delegation lineage visible | ✅ |
| accountability preserved | ✅ |
| immutable audit trail | ✅ |
| queue routing functional | ✅ |
| workflow-safe transitions | ✅ |
| concurrency safe | ✅ |
| RBAC tested | ✅ |

---

# FINAL PRINCIPLE

Tracknov task assignment must behave like:
controlled workflow orchestration

NOT:
simple ticket assignment

END OF DOCUMENT
