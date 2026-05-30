# RBAC Endpoint Closure Report

Updated: 2026-05-06 IST

Reference capability file: `lib/rbac.ts`

## Capability matrix summary

- `canReviewProjectDocuments`
- `canUploadProjectDocuments`
- `canAccessBillingAndInvoice`
- `canExportProjectArtifacts`
- `canManageProjectGuidebook`
- `canDeleteProjects`

## Endpoint closure

| Endpoint | RBAC gate | Status |
|---|---|---|
| `/api/projects/[id]/audit-export` | `canReviewProjectDocuments` | Closed |
| `/api/projects/[id]/client-report` | `canAccessBillingAndInvoice` | Closed |
| `/api/projects/[id]/submission-pack` | `canExportProjectArtifacts` | Closed |
| `/api/projects/[id]/summary` | `canExportProjectArtifacts` | Closed |
| `/api/projects/[id]/tracker` | `canExportProjectArtifacts` | Closed |
| `/api/assistant/project-upload` | service-level role + project checks | Closed |
| `/api/documents/[id]` | auth + project membership + signed URL | Closed |
| `/api/project/invite` | member provisioning via guarded service path | Closed |
| `/api/project/join` | join-by-code via service checks | Closed |

## Role deviations currently intentional

- `client` is read-only for uploads (blocked in upload actions/services).
- Project deletion remains Super User only.

## Evidence pointers

- `app/api/projects/[id]/audit-export/route.ts`
- `app/api/projects/[id]/client-report/route.ts`
- `app/api/projects/[id]/submission-pack/route.ts`
- `app/api/projects/[id]/summary/route.ts`
- `app/api/projects/[id]/tracker/route.ts`
- `app/api/documents/[id]/route.ts`
- `lib/rbac.ts`
