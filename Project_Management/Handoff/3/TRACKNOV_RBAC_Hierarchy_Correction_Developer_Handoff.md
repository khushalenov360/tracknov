# TRACKNOV — RBAC HIERARCHY CORRECTION & IMPLEMENTATION FREEZE
## Developer Handoff

# FINAL ROLE HIERARCHY (FROZEN)

| Level | Role | Authority |
|---|---|---|
| L5 | System Admin | Global governance + override |
| L3 | Project Admin | Final validator + workflow controller |
| L1 | Project Owner | Operational coordinator |
| L2 | Client | Read-only visibility |
| L0 | Contributor | Upload/execution tasks |

# CRITICAL CORRECTION

L1 = operational execution layer
L2 = passive visibility layer

# L1 — PROJECT OWNER

Allowed:
- assign/reassign submittals
- coordinate contributors
- monitor project execution
- request updates
- internal review
- track blockers
- manage execution workflow

Not Allowed:
- final approve/reject
- certification override
- runtime governance actions

# L2 — CLIENT

Strictly read-only.

Allowed:
- project progress
- certification readiness
- reports
- blockers
- timelines

Forbidden:
- uploads
- approvals
- assignments
- workflow actions
- validations

# IMPLEMENTATION IMPACTS

## RBAC ENGINE
Update:
- capability matrix
- permission registry
- authorization middleware
- allowed_actions contracts

## FRONTEND
L2 dashboards:
- remove workflow actions
- remove queues
- remove assignment controls

L1 dashboards:
- add operational coordination features

# REQUIRED L1 FEATURES

- assignment panel
- contributor tracking
- clarification coordination
- blocker management

# REQUIRED L2 FEATURES

- progress visibility
- readiness visibility
- reports
- audit-safe summaries

# API AUTHORIZATION

## L1 APIs
- assign_submittal
- reassign_submittal
- request_update
- comment

## L2 APIs
- view_project
- view_progress
- view_reports
- view_readiness

No mutation APIs for L2.

# PRODUCTION BLOCKERS

DO NOT DEPLOY if:
- L2 can mutate workflow
- L2 sees queues
- L2 can assign users
- L2 can upload
- L1 lacks assignment authority

# FINAL IMPLEMENTATION LAW

L1 = operational execution coordination
L2 = passive stakeholder visibility

END OF HANDOFF
