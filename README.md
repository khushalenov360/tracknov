# HaritaDocs

HaritaDocs is a Next.js 14 workspace for IGBC Green Interiors documentation collection, review, and submission packaging. It is built around the real CCIL documentation tracker and the IGBC Green Interiors v2 reference guide supplied for this build.

The current UI is intentionally dense and operational rather than marketing-led:

- A slim dashboard header with KPI strip and inline project creation
- Full-width project rows with quick workspace and submission actions
- A three-column project workspace with category rail, dense credit table, and right-side detail panel
- Plain consultant-facing copy in demo states instead of exposing internal implementation terms

## Fast onboarding

For Windows setup, use the guided bootstrap instead of following setup steps manually.

Important:

- If you cloned the repo, run the command from the `harita` folder, not from `C:\Users\<name>` or another parent folder.
- If this project is being distributed to consultants as a folder or zip, they should use the root launcher files in that folder instead of the internal `scripts\` path.

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\onboard.ps1
```

Or, from the folder consultants receive:

```powershell
powershell -ExecutionPolicy Bypass -File .\Start-Harita.ps1
```

You can also double-click `Start-Harita.bat` in that folder.

Or with an absolute path:

```powershell
powershell -ExecutionPolicy Bypass -File C:\path\to\harita\scripts\onboard.ps1
```

This flow will:

1. Install `bun` if it is missing
2. Run `bun install`
3. Copy `.env.example` to `.env.local`
4. Prompt for Supabase values one by one
5. Optionally run `supabase link` and `supabase db push`
6. Optionally seed a first project
7. Launch the local studio and offer a Playwright smoke test

If bun is already installed, the same flow can be launched directly with:

```bash
bun run onboard
```

## Stack

- Next.js 14 App Router
- Supabase Auth, Postgres, Storage, Realtime-compatible notifications
- Tailwind CSS + shadcn-style component structure
- XLSX export via `xlsx`
- ZIP submission pack via `jszip`
- PDF summary via `pdf-lib`
- Guided onboarding via `bun`
- Playwright smoke verification

## Setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` for `npm run seed`
4. Apply `supabase/migrations/0001_initial.sql`
5. Run `npm run dev`

Without env vars, the app stays on the login screen and prompts for live Supabase configuration.
The guided launcher avoids crowded default ports by starting HaritaDocs on its own local port range beginning at `3010`.

## Guided commands

- `bun run onboard`
  Runs the full interactive setup wizard.
- `bun run dev:guided`
  Starts the app, waits for `/login`, and offers to run the smoke test.
- `bun run smoke`
  Runs the prebuilt Playwright smoke test.

## Database notes

- The seeded IGBC catalog lives in [data/igbc-green-interiors-v2.json](/C:/Users/visha/harita/data/igbc-green-interiors-v2.json)
- The credit matrix is derived from the CCIL tracker workbook you provided, not hand-entered
- The tracker source produces 47 seeded rows including mandatory requirements, which differs from the original 42-credit note in the prompt

## Optional automation env values

These are only needed if you want the onboarding wizard to automate Supabase linking and migration application:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN`

If these are blank, onboarding still completes the app env setup and launch flow, but skips automatic migration push.

## Seed command

`npm run seed -- "HaritaDocs Seed Project" Gold <owner-user-id>`

- Creates a test project
- Seeds the full credit catalog
- Optionally adds one owner membership if a Supabase `auth.users.id` is provided

## Product surfaces

- `/login`
  Email/password sign-in for the live workspace, with password reset support and no seeded fallback data.
- `/dashboard`
  Dense consultant dashboard with KPI strip, inline project creation, and compact project rows.
- `/projects`
  ENOVAIT-style project portfolio with client, location, project type, team count, document count, rating target, and workspace actions.
- `/documents`
  Unified document hub for project-level files and IGBC credit evidence, with upload, search, project filters, and validation status labels.
- `/credits`
  IGBC score overview for each project using ENOVAIT's New Interiors / Existing Interiors point model and Harita's detailed evidence tracker.
- `/team`
  ENOVAIT-style team surface mapped to Harita project membership roles: admin, consultant, architect, MEP, contractor, client, and owner.
- `/projects/[id]`
  Three-column workspace with category navigation, dense credit table, status/doc requirement chips, upload/review actions, and remarks.
- `/projects/[id]/submission`
  Completed-credit submission view with approved document list and ZIP export gating based on mandatory credits.

## Unified merge model

- Harita is the target runtime: Next.js, Supabase Auth, Postgres, Storage, RLS, exports, and demo fallback stay canonical.
- ENOVAIT project, document, team, role, and IGBC scoring features are mapped into Harita routes and tables.
- Document status conflicts are resolved by using Harita database values (`uploaded`, `approved`, `rejected`) and ENOVAIT-facing labels (`Pending`, `Validated`, `Rejected`) in the UI.
- Project roles are unified across both apps: `admin`, `consultant`, `architect`, `mep`, `contractor`, `client`, and `owner`.
- Project-level documents and credit-level evidence now share one `documents` table; `credit_id` is nullable for general ENOVAIT project files.

## Exports

- `/api/projects/[id]/tracker`
  CCIL-style XLSX export.
- `/api/projects/[id]/summary`
  PDF summary export.
- `/api/projects/[id]/submission-pack`
  ZIP export of approved documents.
