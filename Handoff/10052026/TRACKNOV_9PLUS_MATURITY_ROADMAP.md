# TRACKNOV_9PLUS_MATURITY_ROADMAP

## Purpose
Developer implementation roadmap to elevate Tracknov into a 9+ maturity certification execution platform.

---

# CURRENT STATE SUMMARY

| Area | Current | Target |
|---|---|---|
| Runtime enforcement | 4.5 | 9+ |
| Certification closure | 3.5 | 9+ |
| IGBC rule intelligence | 5 | 9+ |
| Deterministic orchestration | 4 | 9+ |
| Pilot readiness | 5.5 | 9+ |
| Enterprise readiness | 2.5 | 9+ |

---

# CORE STRATEGY

Tracknov =
- Certification Execution Operating System
- Document Management Platform
- IGBC-first
- Future multi-certification extensible

Future-ready for:
- LEED
- GRIHA
- EDGE
- WELL

---

# PHASE 1 — RUNTIME STABILIZATION

## MUST IMPLEMENT

### Workflow Engine
- Backend authoritative transitions only
- No frontend state mutation

### Derived State Engine
- Scoring and readiness derived only
- No manual updates

### Validation Interception
- Every transition validated
- RBAC enforced
- Mandatory checks enforced

### Immutable Audit Chain
Track:
- approvals
- rejections
- mappings
- scoring changes
- overrides

### Concurrency Protection
Implement:
- optimistic locking
- queue-based reviews
- stale-state rejection

---

# PHASE 2 — CERTIFICATION INTELLIGENCE

## IMPLEMENT

### Credit Intelligence
- applicability logic
- prerequisites
- dependencies
- mandatory gating

### Evidence Intelligence
- reusable evidence
- missing proof detection
- acceptable evidence combinations

### Multi-layer Scoring
Support:
- EXPECTED_POINTS
- PROVISIONAL_POINTS
- VALIDATED_POINTS
- LOCKED_POINTS
- CERTIFIED_POINTS

### Clarification Intelligence
- downstream invalidation
- revalidation propagation
- lineage tracking

---

# PHASE 3 — CERTIFICATION CLOSURE ENGINE

## MUST IMPLEMENT

### Certification Snapshot
Freeze:
- evidence
- scores
- approvals
- timestamps
- workflows

### Audit Replay
Reconstruct:
- historical certification states
- validation history
- evidence lineage

### Submission Freeze
After closure:
- no edits
- no overwrite
- no recalculation

---

# PHASE 4 — AI + RULE VALIDATION

## VALIDATION LAYERS

### Rule Engine
Deterministic checks:
- mandatory docs
- thresholds
- mappings
- workflow legality

### AI Assistance
AI may:
- suggest
- classify
- summarize
- detect anomalies

AI may NEVER:
- approve
- reject
- certify

### Consultant Finalization
Only humans may:
- approve
- reject
- certify
- override

---

# PHASE 5 — ENTERPRISE HARDENING

## MUST IMPLEMENT

### Runtime Acceptance Matrix
Every module must pass:
- workflow integrity
- RBAC integrity
- audit integrity
- scoring integrity

### Golden Flow
Perfect:
Upload
→ Validation
→ Submission
→ Review
→ Approval
→ Scoring
→ Closure
→ Audit Replay

### Submission Packaging
Generate:
- IGBC packs
- audit exports
- certification archives

---

# NO-SHIP BLOCKERS

DO NOT DEPLOY if:
- workflow bypass possible
- scoring manually editable
- audit replay impossible
- approvals mutable
- evidence lineage incomplete
- concurrency unsafe

---

# FINAL EXECUTION PRIORITY

1. Runtime determinism
2. Workflow enforcement
3. Validation authority
4. Derived scoring
5. Closure immutability
6. Audit replay
7. Certification intelligence
8. Enterprise scalability
