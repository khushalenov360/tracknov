# Tracknov Handoff

## What is ready

- Tracknov is connected to the Supabase project at `uiecvxxamykfubgtqzap`.
- Core Supabase schema migrations up to the current local set have been prepared in `supabase/migrations/`.
- Live auth has been wired for Supabase login flows.
- The role hierarchy has been updated in the app:
  - `Super User` is the apex role.
  - `Project Admin` sits under `Super User`.
  - `Client` is the highest client-side role.
  - `Project Owner` reports to `Client`.
  - `Architect`, `MEP Consultant`, and `Contractor` report to `Project Owner`.
- Team creation rules were updated to reflect that hierarchy.
- Project RBAC helpers were added in `lib/rbac.ts`.
- Project controls were added:
  - create project for `super_user` and `super_admin`
  - update project for `super_user`, `super_admin`, and assigned `project_admin`
  - delete project for `super_user` only
- A new migration was added for project-level RBAC policies:
  - `supabase/migrations/0005_project_rbac.sql`
- Login page startup/build issue was fixed by wrapping the `LoginForm` search-param usage in `Suspense`.
- Production build now completes successfully.
- Document upload path was improved:
  - upload filenames are sanitized before storage upload
  - the upload form reset bug was fixed
  - Supabase membership helper functions were updated to `security definer` to prevent recursive RLS failures during upload
- A new migration was added for upload-policy/helper stability:
  - `supabase/migrations/0006_security_definer_membership_helpers.sql`
- Document workflow was upgraded from generic project-file intake to credit-mapped intake:
  - each upload is mapped to a credit at upload time
  - the Documents page now requires project, credit, and document-type mapping before upload
  - credit-workspace uploads use the same safer filename and reset behavior
- Document review workflow was upgraded to two steps:
  - `uploaded` -> pending `Project Owner` review
  - `owner_approved` -> pending `Project Admin` review
  - `approved` -> eligible for submission-pack inclusion
  - `rejected` -> excluded with remark trail
- A new migration was added for the document review workflow:
  - `supabase/migrations/0007_document_review_workflow.sql`
- Obvious test projects named `Test` were deleted from the live Supabase project.

## What still needs to be done next

### 1. Verify document workflow end to end

The known blocking login-page build issue is fixed. The next live verification pass should cover the full document workflow:

- upload file from `/documents` with project -> credit -> document-type mapping
- confirm storage object is created
- confirm `documents` row is created
- confirm `uploaded` state appears as pending Project Owner review
- confirm Project Owner can forward the document to Project Admin
- confirm Project Admin can include it for submission pack
- confirm uploaded file opens from the UI
- confirm no further storage/database errors appear for larger PDFs

### 2. Re-apply latest migration to live Supabase if needed

If the live database does not yet have the latest policy changes, apply:

- `supabase/migrations/0005_project_rbac.sql`
- `supabase/migrations/0006_security_definer_membership_helpers.sql`
- `supabase/migrations/0007_document_review_workflow.sql`

This is the DB-level enforcement for:

- super-user-only project delete
- project-admin/super-admin project update
- super-user elevated project select
- non-recursive membership helper evaluation during storage/document RLS checks
- two-step document review state with Project Owner and Project Admin gates

### 3. Reduce uploaded file size

This has not been implemented yet, but it is the next practical improvement for real usage. Recommended approach:

- add frontend file-size validation with clear limits
- auto-resize/compress images before upload
- warn on oversized PDFs and request optimized uploads
- optionally add a server-side compression pipeline later if needed

### 4. Clean package/app identity

The product is now Tracknov, but there are still legacy Harita package/repo strings in places like:

- `package.json`
- repository metadata
- some internal naming

This is cosmetic/cleanup, not a runtime blocker.

## Files changed in this handoff batch

- `app/actions.ts`
- `app/projects/[id]/page.tsx`
- `app/projects/page.tsx`
- `app/team/page.tsx`
- `lib/data.ts`
- `lib/rbac.ts`
- `app/login/page.tsx`
- `components/project/general-upload-document-form.tsx`
- `components/project/upload-document-form.tsx`
- `supabase/migrations/0005_project_rbac.sql`
- `supabase/migrations/0006_security_definer_membership_helpers.sql`
- `supabase/migrations/0007_document_review_workflow.sql`
- `handoff.md`

## Files intentionally not meant for commit

- `.tmp-supabase-push/`
- `.tmp-supabase-fix/`
- `.tmp-supabase-fix-sql/`
- `devserver.log`
- `devserver.err.log`

These are local operational artifacts only.
