# TRACKNOV — IMPLEMENTATION RULES & ENGINEERING GOVERNANCE

---

# 1. CORE PRINCIPLE (NON-NEGOTIABLE)

Tracknov is:

> A certification enforcement engine

NOT:

* a generic SaaS
* a file upload tool
* a dashboard product

Every implementation decision must prioritize:

1. Validation integrity
2. Workflow integrity
3. Audit traceability
4. Certification correctness

UI convenience is always secondary.

---

# 2. MANDATORY BUILD ORDER

Development MUST follow this order:

```text
Schema
-> Constraints
-> Validation
-> Workflow
-> APIs
-> UI
-> AI
```

---

## Forbidden

```text
UI first
API later
DB enforcement later
```

---

# 3. NO BUSINESS LOGIC IN FRONTEND

Frontend may:

* display
* trigger API calls
* render state

Frontend may NEVER:

* decide workflow
* validate certification
* calculate scoring
* authorize transitions

---

## Correct

```text
UI -> API -> Engine -> DB
```

---

## Forbidden

```text
UI -> directly updates state
```

---

# 4. DATABASE IS FINAL AUTHORITY

If API and DB disagree:

> DB wins

All critical enforcement MUST exist in DB:

| Enforcement          | Required   |
| -------------------- | ---------- |
| Workflow transitions | DB trigger |
| Validation blocking  | DB trigger |
| Role enforcement     | DB         |
| Immutability         | DB         |
| Derived states       | DB         |

---

# 5. EVERY BUSINESS RULE MUST EXIST IN 4 PLACES

No rule is considered implemented unless it exists in:

| Layer                 | Mandatory |
| --------------------- | --------- |
| Architecture document | Yes       |
| DB enforcement        | Yes       |
| API validation        | Yes       |
| QA test case          | Yes       |

---

## Example

Rule:

```text
No state skipping
```

Must exist in:

* architecture docs
* transition table
* API guard
* QA tests

---

# 6. DERIVED STATES MUST NEVER BE MANUAL

These are derived:

* credit status
* project status
* scoring
* certification readiness

---

## Forbidden

```text
UPDATE project_status = 'READY'
```

---

## Correct

```text
trigger/recalculation engine computes status
```

---

# 7. ALL AUDIT TABLES ARE IMMUTABLE

The following tables MUST be append-only:

* audit_logs
* document_versions
* override_logs
* workflow_history

---

## Rules

### Forbidden

* UPDATE
* DELETE

### Allowed

* INSERT only

---

# 8. DOCUMENTS MUST NEVER BE OVERWRITTEN

Every revision MUST create:

```text
new document_version
```

---

## Forbidden

```text
UPDATE documents.file_url
```

---

# 9. WORKFLOW ENGINE RULES

All transitions MUST:

* use transition matrix
* be role validated
* be assignment validated
* be audit logged

---

## Forbidden

Direct state updates:

```text
UPDATE submittals SET state='APPROVED'
```

---

## Correct

```text
/workflow/transition
-> DB validation
-> audit log
-> derived recalculation
```

---

# 10. VALIDATION ENGINE IS CENTRAL AUTHORITY

Validation engine decides:

* completeness
* mandatory checks
* document eligibility
* threshold checks

Workflow engine only controls:

* lifecycle progression

---

## Correct hierarchy

```text
Validation
-> permits
Workflow
-> transitions
```

---

# 11. AI IS NEVER AUTHORITATIVE

AI may:

* suggest
* summarize
* explain
* recommend

AI may NEVER:

* approve
* reject
* bypass validation
* modify workflow state

---

# 12. NO DIRECT DB ACCESS FROM UI

All UI communication MUST go through:

```text
/api/*
```

---

## Forbidden

* direct Supabase writes from frontend
* client-side workflow updates
* client-side validation bypass

---

# 13. ALL TABLES REQUIRE OWNERSHIP STRATEGY

Every table must explicitly define:

| Requirement     | Mandatory |
| --------------- | --------- |
| Primary owner   | Yes       |
| FK strategy     | Yes       |
| Delete strategy | Yes       |
| Audit strategy  | Yes       |
| RLS strategy    | Yes       |

---

# 14. EVERY TABLE MUST DECLARE DELETION POLICY

One of:

| Policy      | Meaning           |
| ----------- | ----------------- |
| RESTRICT    | prevent deletion  |
| SOFT_DELETE | logical only      |
| VERSIONED   | immutable history |

---

## Undefined delete behavior forbidden

---

# 15. RLS IS MANDATORY FOR ALL PROJECT DATA

Every project-scoped table MUST:

* contain project linkage
* enforce project isolation
* validate auth.uid()

---

## Forbidden

Tables accessible without project membership.

---

# 16. API RULES

Every API must:

1. authenticate
2. authorize
3. validate
4. audit
5. execute
6. recalculate derived states

---

## APIs must NEVER:

* directly mutate without validation
* skip workflow checks
* skip audit logging

---

# 17. EVERY FEATURE REQUIRES FAILURE TESTS

Testing happy path only is forbidden.

Mandatory tests:

* invalid transitions
* unauthorized actions
* overwrite attempts
* orphan creation
* invalid mappings
* derived-state drift

---

# 18. EVERY PR MUST PASS GOVERNANCE CHECKLIST

Before merge:

| Check                  | Required |
| ---------------------- | -------- |
| DB constraints added   | Yes      |
| Validation integrated  | Yes      |
| Audit logging present  | Yes      |
| Derived states updated | Yes      |
| QA tests added         | Yes      |
| RLS verified           | Yes      |

---

# 19. FEATURE FREEZE RULE

No new feature may begin if:

* workflow integrity incomplete
* validation incomplete
* audit safety incomplete

---

# 20. SYSTEM GOVERNOR ROLE (MANDATORY)

One person/team owns:

* architectural consistency
* workflow integrity
* audit correctness
* enforcement validation

This role has:

> merge veto authority

---

# 21. IMPLEMENTATION PHILOSOPHY

The system must always behave like:

```text
Compliance engine first
SaaS second
```

NOT:

```text
SaaS first
Compliance later
```

---

# 22. FINAL NON-NEGOTIABLES

The following are system-breaking violations:

* workflow bypass
* missing audit chain
* mutable versions
* manual derived states
* frontend business logic
* AI authority
* direct DB writes from UI

Any one of these:

> blocks production release

---

# FINAL STATEMENT

Tracknov succeeds only if:

* enforcement is stronger than convenience
* validation is stronger than UI
* auditability is stronger than speed

This is not a productivity app.

This is a certification reliability engine.

---

END OF DOCUMENT
