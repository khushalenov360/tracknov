# TRACKNOV — MASTER SYSTEM ARCHITECTURE (FINAL)

---

# 🔷 1. PRODUCT DEFINITION (LOCKED)

Tracknov is:

> **A Workflow-Driven IGBC Certification Execution Engine**

It is NOT:

* A document storage system
* A generic SaaS
* An ESG reporting tool

---

# 🔷 2. CORE PRINCIPLE (NON-NEGOTIABLE)

> **Validation controls decisions
> Workflow controls state
> AI assists only**

(Aligned with Copilot architecture )

---

# 🔷 3. SYSTEM ARCHITECTURE (FINAL)

```text
Manual (Locked Source of Truth)
 ↓
Credit Engine (Structure)
 ↓
Validation Engine (Rules)
 ↓
Workflow Engine (State Control)
 ↓
Document Engine (Execution)
 ↓
Scoring Engine (Outcome)
 ↓
Copilot (Guidance Layer)
```

---

# 🔷 4. CORE DATA MODEL

```text
Project
 → Project Credits
   → Credit Stages (Design / Construction)
     → Submittals
       → Documents (Versioned)
```

(Aligned with IGBC system architecture )

---

# 🔷 5. CORE ENGINES (SYSTEM HEART)

---

## 5.1 CREDIT ENGINE

* Loads IGBC credit structure
* Handles stage separation
* Defines submittals

---

## 5.2 DOCUMENT ENGINE

* Upload + version control
* Mapping to submittals
* Evidence layer

---

## 5.3 WORKFLOW ENGINE

* Enforces state transitions
* Prevents invalid states
* Fully backend-controlled

States:

```text
DRAFT → READY → SUBMITTED → UNDER_REVIEW → CLARIFICATION → RESUBMITTED → APPROVED / REJECTED
```

---

## 5.4 VALIDATION ENGINE (CORE AUTHORITY)

Runs on:

* Upload
* Mapping
* Submission

Checks:

* Mandatory documents
* Document type
* Numeric thresholds
* AI-supported validation

👉 Blocks invalid workflow progression

---

## 5.5 SCORING ENGINE

* Calculates credit points
* Aggregates project score
* Determines certification level

---

## 5.6 AUDIT ENGINE

* Tracks:

  * State changes
  * Document uploads
  * Overrides

👉 Ensures legal-grade traceability

---

## 5.7 OVERRIDE ENGINE

* Controlled admin corrections
* Full audit logging

---

## 5.8 COPILOT ENGINE (AI)

Role:

* Guide
* Explain
* Suggest

Restrictions:

* Cannot change state
* Cannot override validation

---

# 🔷 6. EXECUTION FLOW (END-TO-END)

```text
Upload Document
 → Validation Engine
 → Mapping to Submittal
 → Validation Check
 → Workflow Update
 → Credit Completion
 → Project Scoring
 → Certification Decision
```

---

# 🔷 7. CONTROL LAYERS

---

## 🔹 7.1 VALIDATION LAYER

* Central authority
* No bypass allowed

---

## 🔹 7.2 WORKFLOW LAYER

* State machine enforcement
* DB-controlled transitions

---

## 🔹 7.3 RBAC LAYER

Roles:

| Role | Access          |
| ---- | --------------- |
| L5   | Full control    |
| L3   | Final validator |
| L1   | Internal review |
| L0   | Upload only     |
| L2   | Read-only       |

---

## 🔹 7.4 ASSIGNMENT LAYER

* Entity-level responsibility
* Submittal-level control

---

## 🔹 7.5 RLS SECURITY LAYER

* Project-level isolation
* No cross-project access

---

# 🔷 8. VALIDATION SYSTEM (DETAILED)

Supports:

* Mandatory document checks
* Document type validation
* Minimum document count
* Numeric thresholds
* AI-assisted validation

👉 All enforced at DB level

---

# 🔷 9. SCORING SYSTEM

---

## Credit Level:

```text
IF APPROVED → full points  
ELSE → zero points
```

---

## Project Level:

```text
SUM(all credit scores)
```

---

## Certification:

```text
IF mandatory credits approved  
AND score ≥ threshold  
→ Certified Level Assigned
```

---

# 🔷 10. AI ARCHITECTURE

Flow:

```text
User Query
 ↓
Intent Router
 ↓
System Answer (if exists)
 ↓
Else → AI
 ↓
Fallback (if needed)
```

---

Rules:

* No hallucination
* No guessing
* Always validation-first

---

# 🔷 11. SYSTEM GUARANTEES

If implemented correctly:

### ✅ Zero invalid submissions

### ✅ Full audit traceability

### ✅ No workflow bypass

### ✅ Multi-project isolation

### ✅ IGBC-compliant execution

---

# 🔷 12. FAILURE CONDITIONS

System fails if:

* Validation is bypassed
* Workflow is UI-controlled
* Documents are overwritten
* RLS is incomplete
* AI is allowed to decide

---

# 🔷 13. SYSTEM MATURITY

| Layer      | Status |
| ---------- | ------ |
| Workflow   | ✅      |
| Validation | ✅      |
| Security   | ✅      |
| Assignment | ✅      |
| Scoring    | ✅      |
| AI         | ✅      |

👉 Overall:

> **Enterprise-grade certification platform**

---

# 🔷 14. STRATEGIC POSITIONING

Tracknov becomes:

> **A Universal Certification Execution Engine**

Capabilities:

* IGBC today
* Other certifications tomorrow
* Scalable rule-based system

---

# 🔷 15. FINAL STATEMENT

> This is not a SaaS tool
> This is a **decision-controlled certification engine**

---

END OF DOCUMENT
