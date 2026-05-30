# TRACKNOV_RUNTIME_RECONCILIATION_AND_REMEDIATION_V2

Status: IMPLEMENTATION-READY DEVELOPER HANDOFF

## FAILURE 1 – AUTHORITATIVE EXECUTION PATH
Repository: core/runtime/, app/api/, lib/
New Files: core/runtime/orchestrator.ts, core/runtime/executionContext.ts
Tests: tests/runtime/orchestrator.spec.ts
Acceptance: API→Validation→RBAC→Workflow→Audit→DerivedState→Commit enforced.

## FAILURE 2 – CREDIT ASSIGNMENT LIFECYCLE
Repository: app/dashboard/, components/project/, lib/
New Files: lib/assignment/assignmentService.ts, lib/assignment/taskGenerator.ts
API: POST /api/credits/{id}/assign
Tests: tests/runtime/assignmentLifecycle.spec.ts
Acceptance: Assignment instantly visible.

## FAILURE 3 – PROGRESS CALCULATION
Repository: core/runtime/derivedStateEngine.ts
Tests: tests/runtime/progressIntegrity.spec.ts
Acceptance: Backend authoritative progress.

## FAILURE 4 – QUEUE ENGINE
New File: core/runtime/queueEngine.ts
Tests: tests/runtime/queueEngine.spec.ts
Acceptance: Every workflow action generates queue visibility.

## FAILURE 5 – RBAC
Repository: lib/auth/, app/api/, supabase/migrations/
New File: lib/auth/capabilityEngine.ts
Tests: tests/security/rbac.spec.ts
Acceptance: Unauthorized actions blocked.

## FAILURE 6 – GOVERNANCE DRIFT
Deliverable: 06_Drift_Register.md
Acceptance: No critical drift.

## FAILURE 7 – HARITA COPILOT
Repository: ai/, components/assistant/, lib/assistant.ts
New Files: ai/context/projectContextAssembler.ts, ai/context/creditContextAssembler.ts, ai/context/workflowContextAssembler.ts
Tests: tests/ai/haritaExecutionCopilot.spec.ts
Acceptance: Project-aware recommendations.

## DEPLOYMENT BLOCKERS
workflow bypass, validation bypass, missing queue visibility, frontend permissions logic, missing RLS, mutable audit logs, derived-state drift, AI authority leakage.

## DEFINITION OF DONE
All acceptance tests pass and runtime audits closed.
