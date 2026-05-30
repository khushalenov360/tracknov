# Tracknov – End-to-End Integration Architecture

## Client-Facing Universal Certification Engine (Developer Handoff)

---

# 1. OBJECTIVE

Define the **complete backend integration architecture** for Tracknov, ensuring:

* Modular engine interaction
* Strict workflow enforcement
* Manual-driven validation
* Scalable multi-certification support

---

# 2. CORE SYSTEM PRINCIPLE

> **All business logic is backend-controlled. UI only triggers actions.**

---

# 3. SYSTEM ARCHITECTURE OVERVIEW

```text
Manual → Credit Engine → Validation Engine → Workflow Engine → Documents Engine → Copilot
```

---

# 4. BACKEND LAYER STRUCTURE

---

## 4.1 API GATEWAY

All requests pass through:

```
/api/*
```

### Responsibilities:

* Authentication
* Role validation (RBAC)
* Routing to orchestrator

---

## 4.2 ORCHESTRATION LAYER

Central control layer:

```
Controller → Orchestrator → Engine(s) → DB → Response
```

### Responsibilities:

* Coordinate engine execution
* Maintain execution sequence
* Handle failures and responses

---

## 4.3 ENGINE LAYER

Core system modules:

* Credit Engine
* Document Engine
* Workflow Engine
* Validation Engine
* Copilot Engine

### Rule:

> Engines must be stateless and reusable

---

## 4.4 DATA LAYER (SUPABASE)

Single source of truth:

* Projects
* Credits
* Submittals
* Documents
* Workflow states

---

# 5. API CONTRACT (MANDATORY)

---

## 5.1 PROJECT APIs

```
POST   /projects
GET    /projects/:id
GET    /projects/:id/credits
```

---

## 5.2 MANUAL ENGINE APIs

```
POST   /manuals/upload
POST   /manuals/parse
POST   /manuals/validate
POST   /manuals/lock
```

---

## 5.3 DOCUMENT ENGINE APIs

```
POST   /documents/upload
GET    /documents/:id
POST   /documents/version
```

---

## 5.4 CREDIT MAPPING

```
POST   /credits/:id/map-document
```

---

## 5.5 VALIDATION ENGINE

```
POST   /validation/check-document
POST   /validation/check-credit
POST   /validation/check-project
```

---

## 5.6 WORKFLOW ENGINE

```
POST   /workflow/transition
GET    /workflow/state
```

---

## 5.7 COPILOT ENGINE

```
POST   /copilot/query
POST   /copilot/suggest-mapping
```

---

# 6. CORE EXECUTION FLOWS

---

## 6.1 DOCUMENT UPLOAD FLOW

```
POST /documents/upload
```

### Execution:

1. Document Engine → store file
2. Validation Engine → classify
3. Copilot → suggest credit

### Response:

```
{
  "document_type": "drawing",
  "suggested_credit": "EDA C1",
  "confidence": "high"
}
```

---

## 6.2 DOCUMENT MAPPING FLOW

```
POST /credits/:id/map-document
```

### Execution:

* Validation Engine → rule check
* Workflow Engine → state update
* Document Engine → link

### Failure Response:

```
{
  "status": "rejected",
  "reason": "Missing required data"
}
```

---

## 6.3 CREDIT COMPLETION FLOW

```
POST /credits/:id/mark-ready
```

### Execution:

* Validation Engine → completeness check
* Workflow Engine → transition

---

## 6.4 PROJECT SUBMISSION FLOW

```
POST /projects/:id/submit
```

### Execution:

* Validation Engine → mandatory check
* Scoring Engine → calculate score
* Workflow Engine → final transition

---

# 7. DATABASE RELATIONSHIP MODEL

```
project
 → project_credits
   → submittals
     → documents
```

### Rules:

* Submittal = workflow control layer
* Document = versioned evidence

---

# 8. WORKFLOW ENGINE RULES

---

## Allowed States:

```
DRAFT → READY → SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED
```

---

## Constraints:

* No state skipping
* No UI-based transitions
* Only backend-controlled changes

---

# 9. VALIDATION ENGINE (CENTRAL AUTHORITY)

Validation must run at:

* Document upload
* Credit mapping
* Credit completion
* Project submission

---

## Responsibilities:

* Document type validation
* Requirement matching
* Mandatory checks
* Disqualification enforcement

---

# 10. COPILOT ENGINE RULES

---

## Allowed:

* Suggest mappings
* Explain validation
* Guide next steps

---

## Not Allowed:

* Change workflow state
* Override validation
* Modify data

---

# 11. SYSTEM SAFETY RULES

---

## Forbidden Actions:

* Direct DB writes from UI
* Skipping validation
* Overwriting documents
* Bypassing workflow

---

## Mandatory:

* Versioning for all documents
* Audit logging for all actions
* RBAC enforcement

---

# 12. PERFORMANCE DESIGN

---

## Async Processes:

* Document parsing
* AI analysis

---

## Sync Processes:

* Validation
* Workflow transitions

---

# 13. FINAL SYSTEM FLOW

```
User Action
 → API
 → Orchestrator
 → Engines
 → Database
 → Response
 → UI Update
```

---

# 14. EXPECTED OUTCOME

---

If implemented correctly:

* Modular architecture
* Scalable certification support
* High validation accuracy
* Zero workflow bypass
* Audit-ready system

---

# 15. FINAL PRINCIPLE

> **Validation controls execution. AI assists. Workflow enforces.**

---

**End of Document**
