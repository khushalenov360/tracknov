# Tracknov Release Readiness Checklist

Last updated: 2026-04-28

## 1. Platform and security baseline

- [x] Supabase `public` tables have RLS enabled (`credits`, `documents`, `notifications`, `profiles`, `project_invites`, `project_members`, `projects`, `remarks`).
- [x] Storage policies exist for private document access (`storage_select_project_documents`, `storage_insert_project_documents`, `storage_update_project_documents`).
- [x] Session validation is enforced for API routes (direct user checks or `getProjectWorkspaceForApi` membership checks).
- [x] Service-role usage remains server-side only (`lib/supabase/admin.ts`, server routes/actions only).
- [x] Sensitive debug output reviewed in app runtime paths (`app/error.tsx` is the only app-level console logging and is error-boundary scoped).

## 2. Database migration state

- [x] Migration history contains `0001` through `0007` in `supabase_migrations.schema_migrations`.
- [x] `0006` helper functions verified as `security definer`.
- [x] `0007` document review workflow status constraint supports `uploaded`, `owner_approved`, `approved`, `rejected`.
- [x] Migration filename sequencing normalized to `0001` through `0008`; `supabase migration up` executes without duplicate-version conflicts.

## 3. Application readiness

- [x] App-level global error boundary added (`app/error.tsx`).
- [x] Loading states added to major routes (`app/*/loading.tsx` surfaces).
- [x] Empty states reviewed and added for dashboard, projects, credits, documents upload access, and team.
- [x] Launcher and package identity standardized to Tracknov (`bin/tracknov.mjs`, `Start-Tracknov.*`, metadata).

## 4. Deployment readiness

- [x] Vercel configuration added (`vercel.json`).
- [x] Environment variables documented in `.env.example` and `README.md`.
- [ ] Deployed smoke test pending on hosted URL:
  - login
  - dashboard
  - projects
  - documents upload
  - signed document open
  - tracker/pdf/submission exports
- [ ] Confirm Supabase storage uploads from deployed URL (not local).

## 5. Product workflow verification (still pending)

- [ ] Full live multi-role workflow test:
  upload -> owner review -> admin review -> approved -> submission export.
- [ ] Verify role-based status/mapping edit restrictions for all roles in production-like data.
- [ ] Verify project and document delete controls in live role sessions (`super_user` / allowed reviewer roles).
