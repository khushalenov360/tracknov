# Tracknov — 4 Week Execution Plan (Developer Handoff)

---

# 1. OBJECTIVE

Upgrade Tracknov from:

* UI-driven SaaS → **Workflow-driven certification engine**

Target:

* Architecture: 9/10
* Backend: 9–9.5/10
* UI: 9/10
* Product Readiness: 9/10

---

# 2. CORE PRINCIPLE (NON-NEGOTIABLE)

```text
UI → API → Orchestrator → Validation → Workflow → DB → UI
```

* UI NEVER controls state
* Backend ALWAYS enforces rules

---

# 3. WEEK 1 — WORKFLOW + VALIDATION FOUNDATION

## Goal

Make system **fail-safe**

---

## Tasks

### 3.1 Workflow Enforcement API

Create:

```
POST /workflow/transition
```

Rules:

* No direct status updates from UI
* Validate allowed transitions
* Reject invalid state jumps

---

### 3.2 Validation Engine Integration

Validation must run on:

* Document upload
* Document mapping
* Submittal completion

---

### 3.3 DB Constraints

Enforce:

* No document overwrite (version only)
* No orphan mappings
* Mandatory submittals required

---

## Outcome

* System becomes **rule-driven**
* Prevents invalid data

---

# 4. WEEK 2 — CORE UX REBUILD (CRITICAL)

## Goal

Shift from:

> Credit UI → Submittal UI

---

## Tasks

### 4.1 Submittal List Screen

Columns:

* Submittal name
* Stage
* Status
* Owner
* Deadline

Filters:

* Project
* Stage
* Status

---

### 4.2 Submittal Detail Screen (CORE)

Must include:

#### A. Document Section

* Upload
* Version history
* File preview

#### B. Validation Panel

* Pass / Fail
* Error messages
* Missing requirements

#### C. Workflow State Display

* Current state
* Allowed next actions

#### D. Action Buttons

* Submit
* Request Fix
* Approve

⚠️ All actions call backend APIs only

---

### 4.3 Remove Credit Execution

* Credit screen = view only
* Execution = submittal only

---

## Outcome

* Users execute workflow inside system
* UI aligns with engine

---

# 5. WEEK 3 — ORCHESTRATION + SYSTEM INTEGRATION

## Goal

Connect all modules correctly

---

## Tasks

### 5.1 Orchestrator Layer

Flow:

```
Controller → Orchestrator → Engines → DB
```

---

### 5.2 Standard APIs

Implement:

```
POST /documents/upload
POST /documents/map
POST /validation/check
POST /workflow/transition
```

---

### 5.3 Derived State Logic

* Credit state = derived from submittals
* Project state = derived from credits

---

## Outcome

* No inconsistent states
* Clean system behavior

---

# 6. WEEK 4 — PRODUCT LAYER (SELLABLE SYSTEM)

## Goal

Make system usable + decision-driven

---

## Tasks

### 6.1 Dashboard Upgrade

Show:

* Blocking submittals
* Mandatory pending
* Risk alerts

---

### 6.2 Audit Panel

Track:

* Upload
* Validation
* Approval
* Rejection

---

### 6.3 RBAC Enforcement

| Role | Access      |
| ---- | ----------- |
| L0   | Upload only |
| L1   | Review      |
| L3   | Approve     |
| L2   | Read-only   |

---

### 6.4 Assignment System

Every submittal must have:

* Owner
* Deadline

Auto-create tasks

---

## Outcome

* Product becomes usable + sellable
* Audit-ready system

---

# 7. FINAL SYSTEM BEHAVIOR

```
User Action
 → API
 → Orchestrator
 → Validation Engine
 → Workflow Engine
 → DB
 → UI update
```

---

# 8. EXECUTION ORDER (STRICT)

1. Workflow enforcement
2. Submittal UI
3. Validation integration
4. Orchestrator
5. Dashboard + audit

---

# 9. FAILURE CONDITIONS

DO NOT DEPLOY IF:

* UI can change state directly
* Validation can be bypassed
* Submittal layer missing
* Documents overwrite allowed

---

# 10. SUCCESS METRICS

* Zero manual tracking outside system
* 100% workflow enforcement
* Full audit traceability
* < 20 sec per submittal action

---

# FINAL NOTE

> This is NOT a UI project
> This is a **workflow execution engine with UI as interface**

---

END OF DOCUMENT
