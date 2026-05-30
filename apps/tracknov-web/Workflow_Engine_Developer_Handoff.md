
## 🔒 Unified Workflow Standard (Mandatory)

States:
DRAFT → READY → SUBMITTED → UNDER_REVIEW → CLARIFICATION → RESUBMITTED → APPROVED / REJECTED

Transitions:
- DRAFT → READY
- READY → SUBMITTED
- SUBMITTED → UNDER_REVIEW
- UNDER_REVIEW → APPROVED / CLARIFICATION / REJECTED
- CLARIFICATION → RESUBMITTED
- RESUBMITTED → UNDER_REVIEW

Rules:
- No skipping states
- No custom states
- API-level enforcement only

Locking:
- DRAFT / READY → Editable
- SUBMITTED / UNDER_REVIEW → Locked
- CLARIFICATION → Editable
- RESUBMITTED → Locked

Audit:
- Log all transitions in document_states and activity_logs


# Workflow Engine Developer Handoff.md

## Objective
Control all state transitions across roles and ensure process integrity.

## Core Requirements
- State machine for documents
- Role-based transitions
- Queue management

## Flow
L0 Upload → L1 Review → L3 Validate → Final

## States
- draft
- uploaded
- approved_l1
- approved_l3
- rejected

## Tables
workflow_logs:
- entity_id
- state
- actor
- timestamp

## APIs
- /workflow/transition
- /workflow/history

## Rules
- Only L1 can approve upload
- Only L3 final approval
- Rejection resets flow

## Success
- Zero invalid transitions

## Principle
If workflow breaks, entire system collapses.
