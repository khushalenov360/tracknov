# TRACKNOV — CENTRAL_WORKFLOW_ORCHESTRATION_ENGINE.md

---

# 1. DOCUMENT PURPOSE

This document defines the authoritative orchestration architecture for all workflow mutations inside Tracknov.

This is:

> the single source of truth for runtime workflow behavior.

This document governs:

* workflow mutation lifecycle
* transaction boundaries
* authorization sequence
* validation execution
* assignment enforcement
* derived-state recalculation
* audit generation
* override handling
* certification locking
* concurrency protection

---

# 2. CORE PRINCIPLE (NON-NEGOTIABLE)

ALL workflow mutations MUST pass through:

```text
/api/workflow/transition
```

NO exceptions.

Forbidden:

* direct DB workflow updates
* frontend workflow mutations
* bypass APIs
* background mutation shortcuts
* AI-triggered direct transitions

---

# 3. ORCHESTRATION PHILOSOPHY

Workflow orchestration is:

```text
centralized
deterministic
transactional
auditable
```

NOT:

```text
distributed mutation handling
```

---

# 4. AUTHORITATIVE FLOW

ALL transitions MUST execute:

```text
authenticate
→ membership validation
→ capability validation
→ assignment validation
→ project lock validation
→ workflow legality validation
→ validation engine execution
→ concurrency validation
→ mutation execution
→ audit generation
→ derived-state recalculation
→ scoring recalculation
→ certification evaluation
→ commit
```

Atomic.

---

# 5. TRANSACTION GOVERNANCE

Critical orchestration steps MUST be atomic.

If ANY critical step fails:

```text
ROLLBACK ENTIRE TRANSACTION
```

---

# 6. NON-CRITICAL ASYNC TASKS

The following MAY execute asynchronously:

* notifications
* emails
* analytics
* webhook dispatch
* reporting cache refresh

These MUST NOT affect:

* workflow integrity
* scoring
* validation
* certification state

---

# 7. ORCHESTRATION ENTRYPOINT CONTRACT

Authoritative endpoint:

```http
POST /api/workflow/transition
```

---

# 8. REQUIRED REQUEST PAYLOAD

```json
{
  "entity_type": "submittal",
  "entity_id": "",
  "target_state": "",
  "action": "",
  "reason": "",
  "metadata": {}
}
```

---

# 9. FRONTEND RESPONSIBILITY

Frontend may ONLY:

* request transition
* render returned state
* render allowed actions

Frontend may NEVER:

* decide transitions
* infer permissions
* mutate workflow directly

---

# 10. REQUIRED AUTHENTICATION STEP

System MUST validate:

```text
auth.uid()
```

before ANY orchestration logic.

---

# 11. MEMBERSHIP VALIDATION

System MUST validate:

```text
active project membership
```

through:

```text
project_users
```

before proceeding.

---

# 12. CAPABILITY VALIDATION

Authorization engine MUST evaluate:

* role
* assignment
* workflow state
* project lock state
* override status
* certification state

NOT role alone.

---

# 13. ASSIGNMENT VALIDATION

For review-related actions:

System MUST validate:

```text
current assigned responsible user
```

before mutation.

---

# 14. PROJECT LOCK VALIDATION

If project status:

```text
CERTIFIED_LOCKED
```

system MUST reject:

* uploads
* edits
* transitions
* scoring changes
* validation changes

unless:

```text
L5 override
```

exists.

---

# 15. WORKFLOW LEGALITY VALIDATION

Transition MUST exist inside:

```text
workflow_transition_rules
```

Illegal transitions forbidden.

---

# 16. VALIDATION ENGINE EXECUTION

Before state mutation:

System MUST execute:

```text
validation engine
```

Validation failure MUST block transition.

---

# 17. CONCURRENCY VALIDATION

System MUST detect:

* stale entity versions
* outdated review snapshots
* concurrent conflicting mutations

---

# 18. CONCURRENCY STRATEGY

Tracknov uses:

```text
last write wins
```

BUT:

* approval snapshots remain immutable
* stale reviews become historical
* latest evidence becomes authoritative

---

# 19. APPROVAL SNAPSHOT REQUIREMENT

At approval system MUST freeze:

* evidence versions
* validation snapshot
* scoring snapshot
* assignment snapshot
* rule version snapshot

---

# 20. MUTATION EXECUTION

ONLY after all validations pass:
may workflow state mutate.

Direct state updates forbidden.

---

# 21. WORKFLOW HISTORY REQUIREMENT

Every transition MUST create immutable:

```text
workflow_history
```

entry containing:

* previous state
* new state
* actor
* timestamp
* reason
* assignment snapshot
* validation snapshot

---

# 22. AUDIT REQUIREMENT

Every orchestration action MUST generate:

* audit_logs
* security_events (if relevant)
* override_logs (if override used)

---

# 23. OVERRIDE GOVERNANCE

ONLY:

```text
L5
```

may override:

* workflow
* validation
* scoring
* certification

---

# 24. OVERRIDE REQUIREMENTS

Override MUST require:

* explicit reason
* immutable logging
* actor identity
* before/after snapshots

Silent overrides forbidden.

---

# 25. DERIVED-STATE RECALCULATION

After ANY mutation:

System MUST recalculate:

```text
submittal
→ credit_stage
→ project_credit
→ project
→ certification
```

No stale states allowed.

---

# 26. SCORING RECALCULATION

Workflow changes affecting approval MUST trigger:

* score recalculation
* threshold evaluation
* certification eligibility recalculation

---

# 27. CERTIFICATION EVALUATION

System MUST evaluate:

* mandatory credits
* score thresholds
* lock state
* override status

before certification issuance.

---

# 28. CERTIFICATION LOCKING

After certification issuance:

Project enters:

```text
CERTIFIED_LOCKED
```

state.

Further mutation forbidden unless:

```text
L5 override
```

---

# 29. CLARIFICATION LIFECYCLE

Clarification allows:

* evidence replacement
* metadata editing
* mapping changes
* new document versions

within SAME submittal lifecycle.

---

# 30. CLARIFICATION SAFETY RULE

ANY clarification mutation MUST invalidate:

* previous review authority
* previous validation authority
* previous approval authority

until re-review occurs.

---

# 31. SUBMITTAL LIFECYCLE MODEL

Tracknov uses:

```text
persistent submittal lifecycle
```

Rejected submittals continue through:

```text
CLARIFICATION
→ RESUBMITTED
```

NOT replacement submittals.

---

# 32. DOCUMENT VERSIONING RULE

ALL evidence mutations MUST create:

```text
new immutable document version
```

Overwrite forbidden.

---

# 33. DERIVED STATES MUST NEVER BE MANUAL

Forbidden:

```sql
UPDATE project_status='READY'
```

Only orchestration engine may update derived states.

---

# 34. REQUIRED ORCHESTRATION OUTPUT

Response MUST include:

```json
{
  "workflow_state": "",
  "allowed_actions": [],
  "lock_state": {},
  "validation_status": "",
  "audit_reference": "",
  "derived_state_summary": {}
}
```

---

# 35. ERROR RESPONSE STANDARD

Failures MUST return deterministic errors.

Example:

```json
{
  "status": "validation_failed",
  "message": "Mandatory evidence missing."
}
```

---

# 36. FORBIDDEN IMPLEMENTATION PATTERNS

Forbidden:

* direct workflow DB mutations
* frontend state authority
* partial transaction commits
* mutable audit logs
* mutable approvals
* validation bypass
* scoring bypass
* hidden overrides

---

# 37. SECURITY EVENT REQUIREMENTS

System MUST log:

* unauthorized attempts
* stale mutation attempts
* invalid transitions
* override usage
* lock violations

---

# 38. AI INTEGRATION RULES

AI may:

* suggest
* summarize
* explain

AI may NEVER:

* mutate workflow
* approve
* override
* bypass orchestration

---

# 39. ORCHESTRATION PERFORMANCE REQUIREMENTS

System MUST support:

* deterministic transactions
* indexed workflow queries
* scalable audit inserts
* efficient recalculation paths

---

# 40. GOVERNANCE HIERARCHY

Final authority order:

```text
DB constraints
→ orchestration engine
→ validation engine
→ API layer
→ frontend
→ AI
```

---

# 41. DEFINITION OF DONE

Workflow implementation is NOT complete unless:

* orchestration centralized
* transitions deterministic
* audit immutable
* validation enforced
* derived states synchronized
* scoring deterministic
* certification reproducible
* rollback guaranteed
* project isolation proven

---

# 42. FINAL PRINCIPLE

Tracknov orchestration must behave like:

```text
compliance transaction infrastructure
```

NOT:

```text
generic SaaS CRUD workflow
```

---

END OF DOCUMENT
