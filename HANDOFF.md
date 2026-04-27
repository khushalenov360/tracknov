# Tracknov Handoff

## Project Plan Baseline

- Canonical project plan file:
  - `tracknov-project-plan.md`
- Use this document as the default baseline for project-completion assessment and milestone tracking in future updates.

## Latest execution pass (2026-04-28)

- Closed remaining non-functional pending items from `todo.md`:
  - Empty states aligned on major tabs (`dashboard`, `projects`, `documents`, `team`, `credits`).
  - Tracknov identity cleanup completed for runtime surfaces (`app/`, `components/`, `lib/`, `scripts/`, `bin/`, `README`, launchers).
  - Legacy compatibility launchers removed (`Start-Harita.ps1`, `Start-Harita.bat`, `bin/harita.mjs`).
- Live Supabase verification completed against `uiecvxxamykfubgtqzap`:
  - RLS confirmed enabled on key public tables (`credits`, `documents`, `notifications`, `profiles`, `project_invites`, `project_members`, `projects`, `remarks`).
  - Storage/private access policies confirmed in `pg_policies` (`storage_select_project_documents`, `storage_insert_project_documents`, `storage_update_project_documents`).
  - Migration history confirmed in `supabase_migrations.schema_migrations` through `0007`.
  - `0006` helper functions verified as `security definer`.
  - `0007` document workflow status constraint verified and reapplied safely.
- Deployment readiness artifacts added:
  - `vercel.json`
  - `RELEASE_READINESS_CHECKLIST.md`
  - README deployment env section for Vercel.

### Note on migration tooling

- Migration filenames are normalized to a linear sequence (`0001` ... `0008`) and `supabase migration up` now runs successfully against the live project.
- Latest applied migration: `supabase/migrations/0008_project_rbac.sql`.

## Latest execution pass (todo.md implementation)

- Upload limits were aligned to plan:
  - `50 MB` -> `10 MB` in both document upload forms.
- Upload type validation was aligned to allowed project file types in UI:
  - PDF, DOCX, PNG, JPG/JPEG.
- Oversize guidance was added to upload forms with clear user-facing instructions to compress files.
- Global app error boundary was added:
  - `app/error.tsx`
- Loading states were added for major surfaces:
  - `app/loading.tsx`
  - `app/dashboard/loading.tsx`
  - `app/projects/loading.tsx`
  - `app/projects/[id]/loading.tsx`
  - `app/projects/[id]/submission/loading.tsx`
  - `app/documents/loading.tsx`
  - `app/team/loading.tsx`
  - `app/credits/loading.tsx`
  - shared loader: `components/ui/page-loading.tsx`
- Tracknov identity cleanup was executed for main metadata and onboarding surfaces:
  - `package.json` updated to Tracknov package/repo metadata.
  - `bin/tracknov.mjs` added and wired as primary launcher.
  - `Start-Tracknov.ps1` and `Start-Tracknov.bat` added.
  - Existing `Start-Harita.*` launchers now point to Tracknov binary for compatibility.
  - `README.md`, `.env.example`, onboarding scripts, and seed defaults updated to Tracknov naming.
- `todo.md` was updated with completed checkboxes for the implemented items in Priority 2 and parts of Priority 3.

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
  - `supabase/migrations/0008_project_rbac.sql`
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
- Documents tab editing was expanded with role-aware controls:
  - contributors can edit only their own document mapping before final approval
  - `super_user`, `super_admin`, and `project_admin` can override status at any stage
  - `super_user`, `super_admin`, and `project_admin` can delete documents from Documents tab
- Document names in the Documents table are now secure hyperlinks:
  - each row opens the underlying file in a separate screen through signed URL routing
- Project workspace now includes the AI Validation Assistant panel in the review sidebar.
- A global AI Copilot is now mounted in the shared shell:
  - available on all tabs/pages using `Shell` (dashboard, projects, documents, credits, team, project workspace)
  - collapsible floating side window with persisted collapse state
  - per-tab chat history persisted by route path
  - uses existing `/api/assistant` endpoint with Gemini/fallback behavior
- A Bhavarkua ingestion artifact is ready:
  - `BHAVARKUA_UPLOAD_MAP.md` generated from the submitted ZIP against IGBC catalog expectations
  - generation script: `scripts/build-bhavarkua-upload-map.ps1`
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
- confirm document delete is visible and works for `super_user`, `super_admin`, and `project_admin`

### 2. Use Bhavarkua upload map for structured ingestion

Use `BHAVARKUA_UPLOAD_MAP.md` as the pre-ingestion checklist:

- `Present`: ready to map/upload directly
- `Present but not structured`: evidence exists but folder pattern should be normalized
- `Missing`: confirm NA vs pending evidence before review stage

### 3. Normalize migration sequencing for CI/CD

Completed in this pass. The local sequence now matches runtime history (`0001` through `0008`), and standard `supabase migration up` runs cleanly.

## Files changed in this handoff batch

- `app/actions.ts`
- `app/api/documents/[id]/route.ts`
- `app/documents/page.tsx`
- `app/projects/[id]/page.tsx`
- `app/projects/page.tsx`
- `app/team/page.tsx`
- `lib/types.ts`
- `lib/data.ts`
- `lib/rbac.ts`
- `app/login/page.tsx`
- `components/project/general-upload-document-form.tsx`
- `components/project/upload-document-form.tsx`
- `BHAVARKUA_UPLOAD_MAP.md`
- `scripts/build-bhavarkua-upload-map.ps1`
- `supabase/migrations/0008_project_rbac.sql`
- `supabase/migrations/0006_security_definer_membership_helpers.sql`
- `supabase/migrations/0007_document_review_workflow.sql`
- `HANDOFF.md`

## Files intentionally not meant for commit

- `.tmp-supabase-push/`
- `.tmp-supabase-fix/`
- `.tmp-supabase-fix-sql/`
- `devserver.log`
- `devserver.err.log`

These are local operational artifacts only.
