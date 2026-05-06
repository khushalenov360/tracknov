# API enforcement audit

| Route | Auth | RBAC | Rate Limit | Audit |
|---|---:|---:|---:|---:|
| `app/api/assistant/project-upload/route.ts` | Y | N | Y | N |
| `app/api/assistant/route.ts` | Y | N | Y | N |
| `app/api/assistant/track/route.ts` | Y | N | N | N |
| `app/api/documents/[id]/route.ts` | Y | Y | Y | N |
| `app/api/jobs/notifications/digest/route.ts` | Y | N | N | N |
| `app/api/jobs/runtime/reconcile/route.ts` | Y | Y | Y | N |
| `app/api/me/route.ts` | Y | N | N | N |
| `app/api/my-projects/route.ts` | Y | N | N | N |
| `app/api/project/invite/route.ts` | Y | N | Y | N |
| `app/api/project/join/route.ts` | Y | N | Y | N |
| `app/api/projects/[id]/audit-export/route.ts` | N | Y | Y | Y |
| `app/api/projects/[id]/client-report/route.ts` | N | Y | Y | Y |
| `app/api/projects/[id]/igbc-score/route.ts` | N | N | N | N |
| `app/api/projects/[id]/lifecycle-summary/route.ts` | N | N | N | N |
| `app/api/projects/[id]/submission-pack/route.ts` | N | Y | Y | Y |
| `app/api/projects/[id]/summary/route.ts` | N | Y | Y | Y |
| `app/api/projects/[id]/tracker/route.ts` | N | Y | Y | Y |
| `app/api/sales/case-study/[projectId]/route.ts` | N | Y | N | N |
| `app/api/sales/executive/route.ts` | Y | Y | N | N |
| `app/api/session/heartbeat/route.ts` | Y | N | N | N |
| `app/api/test-permissions/route.ts` | Y | Y | N | N |
