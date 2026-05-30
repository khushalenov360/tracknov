# TRACKNOV — UX WORKFLOW TRANSFORMATION HANDOFF

## OBJECTIVE

Transform Tracknov into a queue-first operational workflow platform.

## CORE PRINCIPLE

Frontend MUST NOT mirror backend hierarchy directly.

Backend hierarchy:
Project → Credit → Stage → Submittal → Document

Frontend should expose:
- My Tasks
- Reviews
- Uploads
- Clarifications
- Blockers
- Approvals

## REQUIRED UX TRANSFORMATION

### REJECTED MODEL
Navigation-first UX with deep hierarchy browsing.

### APPROVED MODEL
Queue-first UX with actionable workflows.

Users should always know:
- what needs action
- what is blocked
- what is pending
- what is ready

## REQUIRED UX ORCHESTRATION LAYER

Create a UX orchestration layer between backend governance and frontend rendering.

Responsibilities:
- task aggregation
- workflow prioritization
- hierarchy abstraction
- state compression
- contextual rendering

## DASHBOARD RULES

REMOVE:
- runtime diagnostics
- desync monitors
- infrastructure counters
- reconciliation tooling

Dashboard priority order:
1. My Priority Tasks
2. Mandatory Blockers
3. Pending Reviews
4. Clarifications
5. AI Guidance

## PRIMARY NAVIGATION

- Dashboard
- My Queue
- Reviews
- Uploads
- Documents
- Approvals

## COGNITIVE RBAC

L0:
- uploads
- pending requests
- clarifications

L3:
- approvals
- blockers
- validations

L5:
- runtime diagnostics
- governance tooling

## STATE COMPRESSION

| Backend | UX |
|---|---|
| READY | Ready |
| UNDER_REVIEW | In Review |
| CLARIFICATION | Needs Action |
| RESUBMITTED | Rechecking |

## REVIEW WORKSPACE

LEFT:
- queue
- blockers

CENTER:
- current submittal
- documents
- approval controls

RIGHT:
- AI guidance
- validation warnings
- workflow history

## UPLOAD FLOW

1. User uploads file
2. AI predicts mapping
3. User confirms once

Users must NEVER manually browse hierarchy unless override required.

## AI COPILOT MODEL

Copilot must behave like embedded workflow intelligence.

AI must be:
- short
- contextual
- actionable

## NEXT BEST ACTION ENGINE

Implement:
getNextBestActions(userId)

Returns:
- highest priority actions
- blockers
- approvals
- missing mandatory items

## REALTIME REQUIREMENT

Realtime updates mandatory for:
- assignments
- reviews
- clarifications
- approvals

## ACCEPTANCE CRITERIA

| Requirement | Mandatory |
|---|---|
| Queue-first UX | ✅ |
| Upload flow simplified | ✅ |
| Review flow compressed | ✅ |
| AI contextualized | ✅ |
| Runtime leakage removed | ✅ |

## FINAL GOAL

Tracknov must feel like a high-trust certification execution workspace.
