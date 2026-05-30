# Tracknov – AI Copilot + Universal Certification Engine

## Master Developer Handoff (Consolidated)

---

# 1. OBJECTIVE

Build a **client-facing Universal Certification Execution Engine** with:

* Manual-driven logic
* Validation-first system
* Workflow enforcement
* Controlled AI Copilot (non-hallucinating, reliable)

---

# 2. CORE PRINCIPLE (NON-NEGOTIABLE)

> **Validation controls decisions. Workflow controls state. AI assists only.**

---

# 3. SYSTEM ARCHITECTURE

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
Copilot (Guidance Layer)
```

---

# 4. CONTROLLED ENGINE SCOPE (V1)

## Supported Requirement Types:

* Document-based
* Checklist-based
* Numeric / Threshold
* Comparative

---

## Supported Scoring Models:

* Fixed
* Tiered
* Mandatory

---

## Not Supported (V1):

* Conditional logic
* Cross-credit dependencies
* Custom formulas

---

# 5. MANUAL PARSING CONTRACT

---

## AI extracts:

* Modules
* Credits
* Requirements
* Evidence rules

---

## Admin validates:

* Credit types
* Thresholds
* Mandatory rules
* Evidence expectations

---

## System locks:

* Version freeze
* No edits allowed

---

# 6. DATABASE ARCHITECTURE (SUPABASE)

---

## Core Flow:

```text
Project
 → Project Credits
   → Submittals
     → Documents
```

---

## Key Rules:

* Submittal = workflow control layer
* Document = evidence (versioned)
* No direct document overwrite
* No orphan records

---

# 7. WORKFLOW ENGINE

---

## States:

```text
DRAFT → READY → SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED
```

---

## Rules:

* No state skipping
* Backend-controlled transitions only
* Role-based permissions

---

# 8. VALIDATION ENGINE (CENTRAL AUTHORITY)

---

## Runs at:

* Document upload
* Credit mapping
* Credit completion
* Project submission

---

## Enforces:

* Document type match
* Requirement completeness
* Mandatory compliance
* Threshold validation

---

# 9. COPILOT (AI SYSTEM)

---

## ROLE

* Guide user
* Suggest mapping
* Explain validation
* Recommend next steps

---

## NOT ALLOWED

* Change system state
* Override validation
* Guess rules or data

---

# 10. AI RUNTIME ARCHITECTURE

---

## Flow:

```text
User Query
 ↓
Intent Router
 ↓
Deterministic Response (if possible)
 ↓
Else → AI Handler
 ↓
Fallback Handler (if AI fails)
```

---

# 11. INTENT ROUTING

---

| Intent     | Handler                  |
| ---------- | ------------------------ |
| next_step  | Workflow + Validation    |
| status     | Database                 |
| mapping    | Validation (+ AI assist) |
| summary    | AI                       |
| comparison | AI                       |
| general    | AI                       |

---

## Rule:

> If answer exists in system → DO NOT use AI

---

# 12. CONTEXT BUILDER

AI must receive structured context:

* User name
* Project details
* Credit details
* Requirements
* Evidence rules
* Documents
* Validation state

---

# 13. RESPONSE TEMPLATE (STRICT)

All AI responses MUST follow:

```text
Hi {user_name} 👋

Assessment:
...

Fit:
Strong / Medium / Not suitable

Reason:
...

Recommendation:
...

Confirm?
```

---

# 14. FALLBACK SYSTEM (MANDATORY)

---

## If AI fails:

* Use rule-based logic
* Return structured response
* NEVER show AI error

---

# 15. VALIDATION-FIRST EXECUTION

---

```text
AI Suggests → Validation Checks → System Allows / Blocks
```

---

## AI never controls execution

---

# 16. ANTI-HALLUCINATION RULE

---

If data is missing:

```text
“I cannot confirm this from your project data”
```

---

## Never:

* Guess
* Assume
* Fabricate

---

# 17. ACTION CONFIRMATION

---

No action without user confirmation:

```text
Confirm?
```

---

# 18. API STRUCTURE

---

## Core APIs:

* /projects
* /manuals
* /documents
* /credits
* /validation
* /workflow
* /copilot

---

## Flow Example:

```text
Upload → Validate → Suggest → Confirm → Map → Validate → Complete
```

---

# 19. TESTING FRAMEWORK (MANDATORY)

---

## Must pass:

* Wrong mapping → blocked
* Missing mandatory → blocked
* AI failure → hidden
* No hallucination
* Consistent responses

---

## Total Test Scenarios:

20 (documented)

---

# 20. PERFORMANCE TARGETS

---

* Deterministic response: <300ms
* AI response: <3 sec
* Fallback response: <500ms

---

# 21. FAILURE CONDITIONS (DO NOT DEPLOY IF)

---

* AI error visible to user
* Wrong mapping allowed
* Submission bypass possible
* Response format inconsistent

---

# 22. FINAL SYSTEM BEHAVIOR

---

```text
User Action
 → API
 → Router
 → Engines
 → Validation
 → Workflow
 → Response
```

---

# 23. FINAL PRINCIPLE

> **AI assists. System decides. Workflow enforces.**

---

# 24. EXPECTED OUTCOME

---

If implemented correctly:

* Zero wrong submissions
* High user trust
* Scalable across certifications
* Production-grade AI reliability

---

**End of Document**
