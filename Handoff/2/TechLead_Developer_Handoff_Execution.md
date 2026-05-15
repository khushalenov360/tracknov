# TechLead Developer Handoff — Tracknov (Execution Version)

## Objective
Convert Tracknov into a workflow-driven IGBC certification engine (not a document tracker).

---

# 1. CORE ARCHITECTURE TASKS

## 1.1 Submittal Layer (FOUNDATION)
Dependencies: project_credit

Tasks:
- Create credit_stages table (Design / Construction)
- Create submittals table
- Map:
  - project_credit → credit_stages
  - credit_stages → submittals
- Enforce FK constraints
- Ensure no credit executes without submittals

---

## 1.2 Document Model Refactor
Dependencies: submittals

Tasks:
- Add submittal_id (MANDATORY)
- Remove direct project → document mapping
- Remove direct credit → document mapping
- Enforce:
  document → submittal → credit_stage → project_credit

---

## 1.3 Project_Credit Enforcement
Dependencies: rating_system, credit_template

Tasks:
- Auto-create project_credit on project creation
- Add UNIQUE(project_id, credit_template_id)
- Add snapshot fields:
  - credit_code
  - credit_name
  - category_name
  - max_points
- Route all workflows through project_credit

---

## 1.4 Workflow Engine (DB ENFORCED)
Dependencies: project_credit, submittals

Tasks:
- Define ENUM:
  DRAFT → READY → SUBMITTED → UNDER_REVIEW → APPROVED → REJECTED
- Create transition rules
- Enforce:
  - No invalid transitions
  - No skipping
- Log all transitions (audit-ready)

---

# 2. CONTROL LAYER TASKS

## 2.1 Orchestrator Layer
Dependencies: all services

Tasks:
- Create orchestrator module
- Enforce:
  API → Orchestrator → Engines → DB
- Remove:
  - API-to-API calls
  - Engine-to-engine calls

---

## 2.2 Validation Engine Guard
Dependencies: orchestrator

Tasks:
- Add context.source:
  - upload
  - mapping
  - submission
- Prevent recursive validation:
  if (context.source === "validation") return;

---

## 2.3 State Change Guard
Dependencies: workflow engine

Tasks:
- Compare states before update:
  if (newState === currentState) return;

---

# 3. PERFORMANCE TASKS

## 3.1 Eliminate N+1 Queries
Dependencies: DB schema stable

Tasks:
- Replace per-credit fetch with bulk query
- Group results in memory

---

## 3.2 Database Indexing
Dependencies: tables exist

Tasks:
- INDEX(project_id)
- INDEX(credit_id)
- INDEX(submittal_id)
- INDEX(state)

---

## 3.3 Caching Layer
Dependencies: API stabilization

Tasks:
- Cache:
  - dashboard
  - credit list
- TTL: 10–30 seconds

---

## 3.4 Async Submission Engine
Dependencies: document model

Tasks:
- Move:
  - ZIP generation
  - PDF generation
- To background jobs
- Return job status

---

# 4. UI ALIGNMENT TASKS

## 4.1 Hierarchy Correction
Dependencies: backend complete

Tasks:
Replace:
  Credit → Documents

With:
  Credit → Stage → Submittal → Documents

---

## 4.2 Analytics & Recommendation Engine
Dependencies: scoring system

Tasks:
- Show:
  - Current score
  - IGBC level
  - Gap to next level
- Suggest:
  - Credits with highest remaining points
- Show:
  - Category-wise contribution

---

# 5. VALIDATION & RULE ENFORCEMENT

## 5.1 Dependency Rules
- Credit APPROVED only if:
  all submittals APPROVED

- Project COMPLETE only if:
  all credits CLOSED

---

## 5.2 Submission Rules
- Allow submission with warnings
- Lock project after submission
- Unlock only via admin override

---

# 6. AUDIT & LOGGING

Tasks:
- Log:
  - workflow transitions
  - overrides (with reason)
  - scoring changes
- Ensure:
  no silent updates

---

# 7. SYSTEM HARD RULES

- No direct use of credit_template in execution
- No document without submittal
- No workflow bypass
- No state skipping
- No document overwrite (versioning only)

---

# 8. DEFINITION OF DONE

System is complete ONLY if:

- Submittal layer implemented
- Workflow enforced at DB level
- No validation loops
- No N+1 queries
- Dashboard loads < 1 sec
- Submission works end-to-end
- Audit logs complete

---

# FINAL NOTE

Without:
- Submittal layer
- Workflow enforcement

Tracknov will remain a document tracker, not a certification engine.
