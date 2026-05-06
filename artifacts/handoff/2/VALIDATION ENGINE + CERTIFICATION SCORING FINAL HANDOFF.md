# VALIDATION_CERTIFICATION_AUDITOR_DEVELOPER_HANDOFF.md

# TRACKNOV — VALIDATION ENGINE + CERTIFICATION SCORING FINAL HANDOFF

Status: Frozen
Priority: P0 Critical
System Area: Validation + Certification Integrity

---

# 1. DOCUMENT PURPOSE

This document defines:

* validation engine authority
* certification scoring architecture
* mandatory credit enforcement
* derived state computation
* evidence-chain integrity
* rule governance
* validation traceability
* scoring immutability
* revalidation behavior
* audit defensibility

This document is:

> SYSTEM ENFORCEMENT LAW

This document is NOT:

* implementation suggestion
* optional guideline
* developer interpretation reference

---

# 2. ASSUMPTION POLICY (MANDATORY)

Developers are strictly forbidden from:

* assuming validation behavior
* assuming scoring logic
* assuming rule interpretation
* assuming workflow effects
* assuming certification outcomes
* assuming prerequisite behavior
* assuming readiness logic
* assuming aggregation rules
* assuming threshold logic
* assuming revalidation behavior

If ANY ambiguity exists:
Developer MUST:

1. stop implementation
2. request clarification
3. obtain written confirmation

Silent assumptions are treated as implementation violations.

---

# 3. CORE PRINCIPLE

Tracknov is:

> a certification-grade validation engine

NOT:

* a document tracker
* a scoring dashboard
* a generic workflow app

Certification outcome MUST always be:

* deterministic
* explainable
* auditable
* reproducible
* evidence-derived

---

# 4. VALIDATION ENGINE AUTHORITY (FROZEN)

Validation Engine is the central authority.

Frozen hierarchy:

```text
Validation
→ permits
Workflow
→ transitions
```

Workflow engine cannot bypass validation engine.

Frontend cannot bypass validation engine.

Direct DB writes cannot bypass validation engine.

---

# 5. MANDATORY VALIDATION FLOW

ALL actions MUST follow:

```text
API
→ Validation Engine
→ Workflow Engine
→ Audit Engine
→ Derived State Engine
→ Database
```

No alternate mutation path allowed.

---

# 6. VALIDATION ENTRY POINTS (MANDATORY)

Validation MUST execute at:

1. upload
2. document mapping
3. assignment
4. review
5. approval
6. rejection
7. clarification
8. submittal completion
9. credit readiness
10. stage submission
11. project submission
12. certification scoring
13. certification recalculation
14. override actions
15. document replacement
16. resubmission

No workflow transition allowed without validation execution.

---

# 7. RULE ENGINE ARCHITECTURE

Rules MUST be:

* database-driven
* versioned
* immutable
* deterministic

Rules MUST NOT be:

* hardcoded in UI
* duplicated across services
* manually inferred
* runtime editable without governance

---

# 8. REQUIRED RULE STRUCTURE

Mandatory entities:

```text
manual_versions
rule_sets
rules
thresholds
mandatory_requirements
rule_dependencies
```

---

# 9. MANUAL VERSION LOCKING (MANDATORY)

Every project MUST be permanently linked to:

```text
manual_version_id
```

Frozen behavior:

* project always evaluates against locked version
* future manual updates MUST NOT affect existing projects
* scoring must remain historically reproducible

---

# 10. RULE IMMUTABILITY

Once used in active project:

* rule logic cannot mutate silently
* threshold changes require versioning
* historical scoring must remain reproducible

Forbidden:

```sql
UPDATE rules SET threshold=...
```

without versioning.

---

# 11. DOCUMENT VALIDATION RULES

Validation engine MUST validate:

* MIME type
* document type
* evidence compatibility
* assignment ownership
* version integrity
* duplicate detection
* mandatory presence
* mapping correctness
* stage compatibility
* workflow state compatibility

---

# 12. DOCUMENT TYPE ENFORCEMENT

Example:

| Submittal Type | Allowed Types |
| -------------- | ------------- |
| DRAWING        | PDF/CAD       |
| CALCULATION    | XLS/PDF       |
| PHOTO          | JPG/PNG       |
| NARRATIVE      | PDF/DOC       |

Invalid evidence MUST fail validation.

---

# 13. COMPLETENESS VALIDATION (MANDATORY)

System MUST validate:

```text
all mandatory approved
→ credit ready
```

If any mandatory evidence missing:

* credit readiness = FALSE

No UI-based approximation allowed.

---

# 14. CERTIFICATION SCORING ENGINE (MANDATORY)

Scoring engine MUST be:

* deterministic
* backend-authoritative
* recalculable
* immutable
* auditable

Frontend may NEVER compute certification score.

---

# 15. CERTIFICATION COMPUTATION FLOW

Frozen hierarchy:

```text
validated evidence
→ approved submittals
→ approved credits
→ threshold computation
→ certification level
```

No manual scoring allowed.

---

# 16. MANDATORY CREDIT FAILURE RULE (FROZEN)

Frozen behavior:

```text
Mandatory prerequisite failure
→ blocks certification computation ONLY
→ does NOT block project workflow
```

Implications:

* project may continue operationally
* stage progress allowed
* certification outcome invalid
* certification level cannot be issued

---

# 17. REQUIRED SYSTEM BEHAVIOR FOR MANDATORY FAILURE

System MUST:

* mark certification state = BLOCKED
* explain blocking reason
* preserve workflow continuity
* prevent certification issuance

System MUST NOT:

* freeze project
* block uploads
* block reviews
* block operational workflow

---

# 18. CERTIFICATION STATE RULES

Allowed certification states:

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
ELIGIBLE
CERTIFIED
INVALID
```

---

# 19. DERIVED STATE ENGINE (MANDATORY)

System MUST automatically derive:

```text
submittal
→ credit_stage
→ project_credit
→ project
→ certification
```

Manual status updates forbidden.

---

# 20. DERIVED STATE RECALCULATION TRIGGERS

Recalculation MUST trigger on:

* upload
* approval
* rejection
* clarification
* document replacement
* override
* resubmission
* assignment changes
* threshold changes
* rule changes

---

# 21. STALE STATE PROTECTION

System MUST detect:

* stale approvals
* outdated validations
* invalidated evidence chains

Example:

```text
approved calculation replaced
→ downstream approvals invalidated
→ revalidation triggered
```

---

# 22. REVALIDATION ENGINE (MANDATORY)

Revalidation MUST cascade automatically.

Example:

```text
document update
→ submittal invalidation
→ credit recomputation
→ certification recomputation
```

---

# 23. VALIDATION TRACEABILITY (MANDATORY)

Every validation MUST store:

* rule evaluated
* evidence used
* evaluator
* timestamp
* outcome
* failed conditions
* derived metrics
* manual version reference

---

# 24. REQUIRED VALIDATION TABLES

Mandatory entities:

```text
validation_runs
validation_results
rule_execution_logs
scoring_snapshots
certification_snapshots
```

---

# 25. EVIDENCE TRACEABILITY (MANDATORY)

System MUST support:

```text
Rule
→ Submittal
→ Document Version
→ Validation Result
→ Decision
→ Certification Snapshot
```

This chain MUST be immutable.

---

# 26. SCORING SNAPSHOTS

Every certification computation MUST create immutable snapshot.

Snapshot MUST store:

* project
* manual version
* score
* achieved credits
* blocked prerequisites
* timestamp
* evidence references

---

# 27. OVERRIDE RULES

Certification override forbidden except:

* L5 governance override

Every override MUST log:

* actor
* reason
* before
* after
* timestamp
* approval chain

---

# 28. FORBIDDEN OPERATIONS

Forbidden:

```sql
UPDATE certification_level='PLATINUM'
```

Forbidden:

* manual score injection
* frontend score calculation
* silent rule mutation
* workflow-only certification
* approval without validation
* mutable certification snapshots

---

# 29. VALIDATION FAILURE BEHAVIOR

If validation fails:

System MUST:

* rollback mutation
* preserve existing state
* log failure
* expose explainable reason

Partial validation completion forbidden.

---

# 30. TRANSACTION SAFETY (MANDATORY)

Validation operations MUST be atomic.

Allowed:

```text
all succeed
OR
all rollback
```

Forbidden:

```text
score updated
but audit missing
```

---

# 31. VALIDATION EXPLAINABILITY

Every failed validation MUST explain:

* what failed
* why failed
* which rule failed
* which evidence caused failure

Forbidden:

```text
FAILED
```

without explanation.

---

# 32. API RESPONSE CONTRACT

Validation APIs MUST return:

```json
{
  "validation_status": "",
  "failed_rules": [],
  "blocking_conditions": [],
  "certification_state": "",
  "score_snapshot_reference": "",
  "revalidation_required": false
}
```

---

# 33. FRONTEND GOVERNANCE

Frontend may:

* display validation
* display score
* display blockers
* display readiness

Frontend may NEVER:

* compute score
* compute readiness
* infer certification state
* bypass validation

---

# 34. AI GOVERNANCE

AI may:

* summarize
* recommend
* explain
* identify risks

AI may NEVER:

* approve
* reject
* score certification
* override validation
* change certification state

---

# 35. AI UNCERTAINTY RULE

If evidence insufficient:

System MUST respond:

```text
I cannot confirm this from project data.
```

No guessing allowed.

---

# 36. PERFORMANCE REQUIREMENTS

| Operation                   | Target  |
| --------------------------- | ------- |
| Validation response         | <2 sec  |
| Derived state recalculation | <3 sec  |
| Certification recomputation | <5 sec  |
| Deterministic validation    | <500 ms |

---

# 37. REQUIRED QA TESTS

System MUST prove:

* mandatory prerequisite blocking
* score reproducibility
* stale approval invalidation
* invalid evidence rejection
* rule version locking
* certification immutability
* derived state accuracy
* rollback safety
* explainable failures
* immutable snapshots
* revalidation cascading
* threshold enforcement

---

# 38. PRODUCTION BLOCKERS

DO NOT DEPLOY if ANY exists:

* scoring outside validation engine
* frontend-derived readiness
* mutable certification snapshots
* missing rule versioning
* missing revalidation
* partial validation execution
* missing explainability
* workflow bypassing validation
* manual certification mutation
* derived state drift

---

# 39. FINAL IMPLEMENTATION ORDER

Mandatory order:

```text
Rule Schema
→ Validation Engine
→ Workflow Integration
→ Derived State Engine
→ Scoring Engine
→ Audit Chain
→ APIs
→ UI
→ AI
```

Forbidden:

```text
UI scoring first
Validation later
```

---

# 40. FINAL ENGINEERING PRINCIPLE

Tracknov certification outcomes MUST always be:

```text
Evidence Derived
Validation Enforced
Audit Defensible
```

Never:

```text
UI Derived
Workflow Assumed
Manually Adjusted
```

---

# 41. FINAL AUDITOR DIRECTIVE

A certification result is considered valid ONLY if:

* every rule is versioned
* every decision is explainable
* every score is reproducible
* every workflow passed validation
* every evidence chain is immutable
* every derived state is synchronized

Anything less is considered:

> non-auditable certification behavior

---

END OF DOCUMENT
