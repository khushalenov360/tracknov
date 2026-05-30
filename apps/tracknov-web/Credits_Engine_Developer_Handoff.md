
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


# Credits Engine Developer Handoff.md

## Objective
Define IGBC credit structure and guidance logic.

## Core Requirements
- Role-based credit mapping
- Detailed requirement definitions
- Multi-document requirements
- Guidance + sample docs

## Tables
credits:
- id
- project_id
- responsible_role
- what_to_submit
- must_contain
- acceptable_format

credit_requirements:
- credit_id
- document_type
- mandatory

## APIs
- /credits/list
- /credits/details

## Rules
- No vague instructions
- Structured requirements only

## Success
- >70% first-time approval

## Principle
If credit logic is unclear, system breaks.
