# TRACKNOV - UX/UI DEVELOPER HANDOFF

Status: mandatory implementation law

## Core Product Principle

Tracknov is a certification workflow execution console. It is not a generic dashboard, document repository, SaaS CRUD app, or task manager.

## Primary UX Model

The frozen reviewer path is:

```text
Project -> Credit -> Stage -> Submittal Queue -> Review -> Next Relevant Submittal
```

The primary execution unit is `Submittal`, not project, credit, or document.

## Mandatory Hierarchy

```text
Project -> Credit -> Stage -> Submittal -> Document
```

UI must preserve this hierarchy everywhere.

## Credit Screen Rules

Credit screens are context screens only. They may display summary, status, progress, and linked submittals. They may not execute workflow transitions, approvals, or validation actions.

## Core Submittal Detail Screen

The submittal detail screen must include:

- Workflow State Panel
- Validation Panel
- Document Viewer
- Version History
- Review Action Bar
- Audit Timeline
- AI Assistance Panel

## Backend Authority Rules

Review actions must come from backend `allowed_actions`. The frontend must never infer permissions, workflow legality, readiness, completion, certification status, or validation success.

Required API contract for workflow-bound responses:

```json
{
  "workflow_state": "",
  "allowed_actions": [],
  "validation_status": {},
  "lock_state": {},
  "audit_reference": ""
}
```

## Universal State Renderer

A centralized `workflowStateRenderer()` must exist to keep state behavior identical everywhere.

Lock-state expectations:

| State | UI behavior |
| --- | --- |
| DRAFT | Editable |
| READY | Limited edit |
| SUBMITTED | Locked |
| UNDER_REVIEW | Read-only |
| APPROVED | Immutable |
| REJECTED | Editable |
| CLARIFICATION | Editable + highlighted |

## Review Queue

Review queue behavior is project-scoped and must prioritize:

- mandatory-first ordering
- clarification prioritization
- assignment-aware ordering
- stage-aware ordering

Review flow:

```text
Review -> Action -> Auto dequeue -> Next relevant submittal
```

## Frontend Trust Boundary

Frontend is only:

- renderer
- workflow interface
- action trigger surface

Frontend is not:

- workflow authority
- validation authority
- certification authority

## AI Panel Role

AI may summarize, explain, highlight, and recommend. AI may not approve, reject, transition workflow, or override validation.

## Concurrency and Error Handling

UI must support stale-state detection, concurrent reviewer detection, optimistic rollback, lock refresh, and conflict handling.

Required conflict response:

```json
{
  "status": "conflict",
  "message": "Entity modified by another reviewer."
}
```

## Document Versioning UI

Reviewer must see previous versions, uploader, timestamp, and linked validation outcomes. Documents are immutable evidence versions.

## Component Architecture

Mandatory structure:

```text
components/
  project/
  credit/
  stage/
  submittal/
  workflow/
  queue/
  validation/
  audit/
  ai/
  shared/
```

Components must avoid duplicated workflow logic and duplicated role logic.

## Production Blockers

Do not deploy with:

- frontend-derived workflow state
- frontend-derived readiness
- inconsistent lock behavior
- direct frontend DB mutation
- queue context loss
- inconsistent review behavior
- unauthorized action visibility
- missing conflict handling

## Definition of Done

A UX/UI feature is complete only when it is backend-authoritative, workflow-safe, validation-visible, lock-safe, queue-compatible, context-persistent, concurrency-safe, and audit-visible.
