# TRACKNOV_DEVELOPER_HANDOFF_STANDARD_V2

Status: FROZEN
Priority: MANDATORY

## New Non-Negotiable Rule

Every Tracknov developer handoff MUST be delivered as a downloadable file.

Accepted formats:
- .md (preferred)
- .docx

Chat-only implementation instructions are not considered completed developer handoffs.

---

## Mandatory Sections

1. Objective
2. Repository Paths
3. Existing Files
4. New Files
5. Dependencies
6. Interfaces
7. Function Signatures
8. Database Migrations
9. API Contracts
10. UI Locations
11. Runtime Ownership Flow
12. Test Files
13. Acceptance Tests
14. Rollback Behaviour
15. Deployment Gates
16. Acceptance Criteria
17. Definition of Done

If any section is missing:

CLASSIFICATION = ARCHITECTURE GUIDANCE

If all sections exist:

CLASSIFICATION = IMPLEMENTATION-READY DEVELOPER HANDOFF

---

## Repository-Aware Handoff Rule

Every implementation instruction must include:

- Exact repository path
- Existing files to modify
- New files to create
- Dependency chain
- Runtime ownership
- Database impact
- API impact
- UI impact
- Test impact

Generic statements such as:

- Implement workflow engine
- Implement replay engine
- Improve validation

are prohibited without repository mapping.

---

## PM Gate

Requirement
→ Repository Location
→ Implementation Unit
→ Acceptance Test
→ Deployment Gate

No developer task may proceed without this chain.

---

## QA Gate

QA may reject implementation when:

- downloadable handoff absent
- repository path absent
- acceptance tests absent
- rollback plan absent

---

# UPDATED TRACKNOV RUNTIME RECONCILIATION HANDOFF SUMMARY

Priority Modules

core/runtime/orchestrator.ts
core/runtime/stateMachine.ts
core/runtime/derivedStateEngine.ts
core/runtime/dependencyEngine.ts
core/runtime/replayEngine.ts
tests/runtime/runtimeAcceptance.spec.ts

Mandatory Acceptance Areas

- Workflow transitions
- RBAC enforcement
- Validation interception
- Audit immutability
- Derived-state recalculation
- Concurrency protection
- Replay determinism
- Queue generation integrity

Deployment Blockers

- Missing state machine
- Missing replay engine
- Missing dependency engine
- Frontend-derived permissions
- Frontend-derived workflow state
- Mutable audit logs
- Missing RLS
- Manual derived-state edits

Definition of Done

- Acceptance tests passing
- Runtime enforcement verified
- Repository paths documented
- Rollback documented
- Downloadable handoff generated
