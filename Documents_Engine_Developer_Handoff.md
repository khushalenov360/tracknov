
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


# Documents Engine Developer Handoff.md

## Objective
Handle full lifecycle of documents: upload, versioning, validation, approval, rejection, and traceability.

## Core Requirements
- Upload (mobile + web)
- Version control
- Status lifecycle
- Mapping to credit_id
- Preview support

## Lifecycle
Draft → Uploaded → L1 Approved → L3 Approved → Final
       → Rejected → Re-upload

## Tables
documents:
- id
- credit_id
- uploaded_by
- status
- version
- file_url
- rejection_reason

## APIs
- /documents/upload
- /documents/list
- /documents/update
- /documents/delete

## Rules
- Version increment on re-upload
- No delete after approval
- Link to token system

## Success
- 95% upload success
- Full traceability

## Principle
If documents are messy, system fails.
