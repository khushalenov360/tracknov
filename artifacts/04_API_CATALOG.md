# 04_API_CATALOG

## API Routes & Endpoints

| Endpoint | Methods | Auth Required | Authorization Roles | Validation Schema | Service Dependencies | Database Dependencies |
|---|---|---|---|---|---|---|
| `/api/assistant/project-upload` | POST, GET | No | Any/None | No | document-service, project-service | upload_attempts |
| `/api/assistant` | POST | Yes | Any/None | Yes (Zod/Custom) | rag-service, tone-service, knowledge-engine, enovaitApiBoundary, capability-registry, harita-runtime-service | security_events |
| `/api/assistant/track` | POST | Yes | Any/None | No | None | user_interactions, user_behavior |
| `/api/credits` | GET | Yes | client | No | None | project_credits |
| `/api/credits/[creditId]/assign` | POST | Yes | Any/None | No | None | project_credits |
| `/api/credits/[creditId]/reassign` | POST | Yes | Any/None | No | None | project_credits |
| `/api/documents/[id]` | GET | Yes | super_admin/super_user, client | No | None | profiles, project_document, project_users |
| `/api/dump-members` | GET | No | Any/None | No | None | None |
| `/api/jobs/notifications/digest` | POST | No | super_admin/super_user, project_admin | No | notification-jobs | None |
| `/api/jobs/runtime/reconcile` | POST | No | super_admin/super_user | No | runtime-governance-service | None |
| `/api/me` | GET | Yes | Any/None | No | None | profiles |
| `/api/my-projects` | GET | Yes | Any/None | No | None | project_users |
| `/api/project/invite` | POST | Yes | Any/None | No | member-service | None |
| `/api/project/join` | POST | Yes | Any/None | No | project-service | None |
| `/api/projects/[id]/audit-export` | GET | No | Any/None | No | audit-service, activity-service | None |
| `/api/projects/[id]/client-report` | GET | No | client | No | client-service, activity-service | None |
| `/api/projects/[id]/igbc-score` | GET | Yes | Any/None | No | igbc-scoring-service, runtime-governance-service | None |
| `/api/projects/[id]/lifecycle-summary` | GET | No | Any/None | No | None | None |
| `/api/projects/[id]/submission-pack` | GET | No | Any/None | No | activity-service, runtime-governance-service | None |
| `/api/projects/[id]/summary` | GET | No | Any/None | No | activity-service | None |
| `/api/projects/[id]/tracker` | GET | No | Any/None | No | activity-service | None |
| `/api/runtime-test` | GET | No | super_admin/super_user, project_admin, owner | No | project-service, document-service, workflow-orchestrator-service | projects, project_users, project_credits, project_document |
| `/api/sales/case-study/[projectId]` | GET | No | client | No | roi-service | None |
| `/api/sales/executive` | GET | No | Any/None | No | roi-service | None |
| `/api/session/heartbeat` | POST | Yes | client | No | None | None |
| `/api/test-permissions` | GET | Yes | client | No | None | profiles, project_users, projects |
| `/api/validation/submittal` | GET | Yes | client | No | None | project_document, validation_results |
| `/api/workflow/transition` | POST | No | Any/None | No | document-state-service | None |

## Cross-Cutting Concerns

### Middleware (`middleware.ts`)
The edge middleware securely enforces a universal authentication gate around all protected routes (`/dashboard`, `/projects`, `/documents`, `/team`, `/credits`, `/review-queue`) by injecting `updateSession(request)` via Supabase SSR. Public paths (`/login`, `/auth`, `/api/auth`) are bypassed to prevent roundtrip blocking.

### Validation Layer (`lib/dtos/*`)
All Data Transfer Objects (DTOs) for API contracts are housed in `lib/dtos/` and leverage Zod for structural parsing.
- `auth.dto.ts`
- `project.dto.ts`
- `credit.dto.ts`
- `document.dto.ts`
- `task.dto.ts`
