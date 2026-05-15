# TRACKNOV_RUNTIME_ACCEPTANCE_MATRIX_V1

## PURPOSE
Defines mandatory SHIP / NO-SHIP runtime acceptance criteria.

## CORE DOMAINS
- Workflow integrity
- Validation integrity
- RBAC integrity
- Audit integrity
- Derived-state integrity
- Frontend isolation
- AI containment
- Runtime stability

## CRITICAL TESTS

### Workflow
- Duplicate approvals blocked
- Invalid transitions blocked
- Stale reviewer actions rejected
- Certified projects immutable

### Validation
- Missing mandatory evidence blocks submission
- Invalid evidence blocks approval
- Threshold failures block certification

### Security
- Cross-project visibility impossible
- Unauthorized approvals blocked
- Prompt injection sanitized

### Audit
- Immutable append-only logs
- Replayable certification history
- Before/after snapshots mandatory

### Derived State
- Automatic recalculation
- Dependency invalidation
- No manual scoring edits

### Frontend
Frontend forbidden from:
- computing readiness
- computing permissions
- mutating DB directly

### Concurrency
- optimistic locking
- stale-state rejection
- atomic transitions
- idempotent retries

## GOLDEN FLOW
Upload
→ Validation
→ Submission
→ Review
→ Approval
→ Scoring
→ Audit Replay

## NO-SHIP CONDITIONS
- mutable audits
- workflow bypass
- missing RLS
- stale approvals
- cross-project leakage
- AI authority leakage