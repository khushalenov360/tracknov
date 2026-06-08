# Tracknov — Complete Project Build Plan
### As Project Owner | Enov360 | IGBC Green Interiors Documentation Platform

---

## Vision

Build a production-ready web application that replaces Excel sheets and WhatsApp groups for IGBC Green Interiors consultants. The app must allow a team of architects, MEP consultants, contractors, and clients to collaborate on certification projects — uploading evidence, tracking credit points, and exporting a clean submission pack to IGBC.

---

## Guiding Principles

- Build and test one thing at a time. Nothing moves forward until the current piece works.
- Every phase ends with a manual test checklist before the next phase begins.
- Database is the source of truth. UI reflects what's in the database, never the other way around.
- Security is not an afterthought. Row-level security is set up from Day 1.

---

## Merged Additions (Updated Plan Overlay - 28 Apr 2026)

The following additions are merged from the updated project plan so this file remains the single source of truth.

### Business Model Additions

- Add plans and pricing with per-project limits for:
  - Document credits
  - Consultant interaction credits
- Real-time usage tracking for consumed and remaining credits per project
- Consultant interaction session logger (credit burn per session/event)
- Billing and invoicing module for plan usage and top-ups

### Product Capability Additions

- Built-in "What to Submit" guidance per credit in plain language
- Credit classification by implementation effort:
  - Easy wins
  - Moderate
  - Hard
- Rejection + resubmit workflow (not only a one-way rejection path)
- Full audit trail and history logs across key actions
- Mobile-optimized UI behavior for login, dashboard, workspace, and documents
- Jargon-free client-facing view separate from internal consultant view
- Cost and effort guidance per credit to aid decision-making
- Onboarding checklist for first-time users

### Delivery and Validation Additions

- Extend execution horizon from 5 weeks to 7 weeks with tighter day-wise checkpoints
- Include explicit role-based test passes for:
  - Super User
  - Super Admin
  - Project Admin
  - Client
  - Project Owner
  - Architect / MEP Consultant / Contractor
- Add performance and mobile QA pass before launch
- Add final launch-day smoke matrix including upload, review, export, and RBAC gates

### Data and Compliance Additions

- Ensure document lifecycle supports:
  - Upload -> Project Owner review -> Project Admin final decision
  - Reopen and resubmit loop with reason tracking
- Enforce timestamp display in IST (Asia/Kolkata) for all user-facing logs
- Maintain immutable change logs for document status transitions

---

## Phase 0 — Foundation (Week 1)

This phase sets up everything the rest of the app depends on. Nothing else is built until this is rock solid.

### 0.1 — Project Setup

What I build:
- Create a new Next.js 14 project with App Router and TypeScript
- Install and configure Tailwind CSS
- Install shadcn/ui component library
- Set up ESLint and Prettier for code consistency
- Create the folder structure: `app/`, `components/`, `lib/`, `data/`, `supabase/`
- Set up a GitHub repository and push the initial commit

Test checklist:
- `npm run dev` starts without errors
- http://localhost:3000 loads a blank page
- No TypeScript errors on build

---

### 0.2 — Supabase Project Setup

What I build:
- Create a new Supabase project
- Store the Project URL, Anon Key, and Service Role Key in `.env.local`
- Install `@supabase/supabase-js` and `@supabase/ssr`
- Create `lib/supabase/client.ts` (browser client)
- Create `lib/supabase/server.ts` (server-side client)
- Create `lib/supabase/middleware.ts` (session refresh)
- Wire up `middleware.ts` at the project root to protect routes

Test checklist:
- Supabase client initialises without "Invalid URL" error
- Middleware correctly redirects unauthenticated users to `/login`
- `.env.local` is listed in `.gitignore` and never committed

---

### 0.3 — Database Schema — Migration 0001

What I build (SQL migration applied to Supabase):

Tables:
- `profiles` — id (links to auth.users), full_name, role, avatar_url, created_at
- `projects` — id, name, client_name, location, project_type, rating_target (Gold/Platinum), status, created_by, created_at
- `project_members` — id, project_id, user_id, role (super_user/project_admin/client/project_owner/architect/mep/contractor), joined_at
- `credits` — id, category, code, title, points_available, is_mandatory
- `project_credits` — id, project_id, credit_id, status (not_started/in_progress/achieved), points_achieved, remarks
- `documents` — id, project_id, credit_id (nullable), uploaded_by, filename, storage_path, document_type, status (uploaded/owner_approved/approved/rejected), review_remark, created_at
- `notifications` — id, user_id, message, is_read, created_at

Row Level Security policies:
- Users can only see projects they are members of
- Only super_user and project_admin can create projects
- Only super_user can delete projects
- Documents follow the two-step review: project_owner approves first, then project_admin

Test checklist:
- All tables created successfully in Supabase dashboard
- RLS is enabled on every table
- Running a SELECT on `projects` as an anonymous user returns zero rows
- Running a SELECT as a logged-in user returns only their projects

---

## Phase 1 — Authentication (Week 1-2)

### 1.1 — Login Page

What I build:
- `/login` page with email and password fields
- "Sign In" button calls Supabase `signInWithPassword`
- Error message shown on wrong credentials
- Redirect to `/dashboard` on success
- Wrap the component in `Suspense` to avoid build errors from `useSearchParams`

Test checklist:
- Wrong password shows "Invalid credentials" error
- Correct password redirects to `/dashboard`
- Refreshing `/dashboard` keeps the user logged in
- Opening `/dashboard` in a new tab without login redirects to `/login`

---

### 1.2 — Password Reset

What I build:
- "Forgot password?" link on login page
- `/reset-password` page with email input
- Supabase sends a reset email
- User lands on a confirm page after clicking the email link
- New password form that calls `updateUser`

Test checklist:
- Reset email arrives in inbox within 1 minute
- Clicking the link opens the app with a valid session
- Setting a new password and logging in works

---

### 1.3 — Invite Flow

What I build:
- `/invite` page that accepts a token from the email link
- Auto-completes signup for invited team members
- Stores their name and role in `profiles` on first login

Test checklist:
- Invite email arrives correctly
- Clicking invite link lands on the `/invite` page
- User can complete signup and is immediately added to the project

---

## Phase 2 — Dashboard (Week 2)

### 2.1 — Dashboard Page

What I build:
- `/dashboard` page (server component, fetches data on the server)
- KPI strip showing: Total Projects, Total Credits Achieved, Documents Pending Review, Upcoming Deadlines
- Recent projects list with quick links to open workspace
- "Create New Project" button (visible only to super_user and project_admin)
- Sign out button

Test checklist:
- Dashboard loads in under 2 seconds
- KPIs show correct counts from the database
- Sign out clears session and redirects to `/login`
- A user with no projects sees an empty state with a clear message

---

## Phase 3 — Projects (Week 2-3)

### 3.1 — Projects List Page

What I build:
- `/projects` page listing all projects the user is a member of
- Each row shows: Project Name, Client, Location, Type, Rating Target, Team Count, Status
- Quick action buttons: Open Workspace, View Credits, View Documents
- "New Project" modal (super_user / project_admin only) with fields: name, client name, location, project type, rating target

Test checklist:
- Only projects the logged-in user is a member of appear in the list
- Creating a project saves it to the database and shows it instantly
- A user without create permission does not see the "New Project" button
- Clicking "Open Workspace" navigates to `/projects/[id]`

---

### 3.2 — Project Workspace Page

What I build:
- `/projects/[id]` three-column layout:
  - Left rail: IGBC credit categories (navigation)
  - Centre: Dense credit table for the selected category showing code, title, status, points, mandatory flag
  - Right panel: Credit detail — description, required documents, upload button, remarks
- Status chips on each credit row: Not Started / In Progress / Achieved
- Clicking a credit row updates the right panel

Test checklist:
- All 47 IGBC credits appear correctly grouped by category
- Clicking a category filters the centre table
- Clicking a credit row loads the detail panel
- Status updates save to `project_credits` in the database

---

## Phase 4 — Credits & IGBC Scoring (Week 3)

### 4.1 — Seed IGBC Credit Catalog

What I build:
- Parse `data/igbc-green-interiors-v2.json`
- Seed script that populates the `credits` table with all 47 credits (category, code, title, points, mandatory flag)
- Run seed as a one-time migration

Test checklist:
- `credits` table has exactly 47 rows after seeding
- Mandatory credits are correctly flagged
- Point values match the IGBC Green Interiors v2 reference guide

---

### 4.2 — Scoring Engine

What I build:
- `lib/igbc-scoring.ts` — functions to calculate:
  - Total points achieved for a project
  - Points available vs points achieved per category
  - Whether mandatory credits are all achieved (required for submission)
  - Rating level reached (Certified / Silver / Gold / Platinum)
- `/credits` page showing the full score breakdown per project

Test checklist:
- Score calculation is correct against a manually verified sample project
- Mandatory credit check blocks submission when any mandatory credit is not achieved
- Rating level updates instantly when credit status is changed

---

## Phase 5 — Documents (Week 3-4)

### 5.1 — Supabase Storage Setup

What I build:
- Create a `documents` storage bucket in Supabase with private access
- RLS policies so users can only access documents belonging to their projects
- File naming: sanitise filename before upload (remove special characters, spaces)
- `lib/supabase/storage.ts` — helper functions for upload, download, delete, get signed URL

Test checklist:
- Upload a PDF via the Supabase dashboard and confirm it appears in the bucket
- Attempting to access a file URL without auth returns a 403 error
- Filenames with spaces or special characters are sanitised correctly

---

### 5.2 — Document Upload

What I build:
- Upload form in the project workspace (right panel) requiring: Project, Credit, Document Type before upload
- Upload form on the `/documents` page for general project-level documents (credit_id is nullable)
- File size validation on the frontend: warn if file is over 10MB
- On upload: save a row to `documents` table with status `uploaded`
- Reset the form after successful upload

Test checklist:
- Uploading a PDF saves the file to Supabase Storage and creates a row in `documents`
- Uploading without selecting a credit shows a validation error
- Form resets to empty after a successful upload
- Uploading a 15MB file shows a size warning

---

### 5.3 — Document Review Workflow

What I build:
- Two-step approval flow:
  - Step 1: `uploaded` → Project Owner reviews → moves to `owner_approved` or `rejected`
  - Step 2: `owner_approved` → Project Admin reviews → moves to `approved` or `rejected`
- Review UI in the project workspace showing pending documents
- Remark field required when rejecting a document
- Status labels in the UI: Pending Review / Owner Approved / Validated / Rejected

Test checklist:
- A newly uploaded document shows as "Pending Review" to the Project Owner
- Project Owner can approve or reject with a remark
- After Project Owner approves, document appears in Project Admin's queue
- Project Admin approves → status becomes "Validated"
- A rejected document shows the rejection remark to the uploader
- A contractor cannot approve their own documents

---

### 5.4 — Documents Hub Page

What I build:
- `/documents` page showing all documents across all projects the user can access
- Filters: by project, by credit category, by status
- Search by filename
- Each row shows: filename, project, credit, document type, upload date, status, uploaded by
- Download button that generates a signed URL from Supabase Storage

Test checklist:
- All documents for the user's projects appear in the list
- Filtering by project correctly narrows results
- Clicking download opens the file in the browser

---

## Phase 6 — Team Management (Week 4)

### 6.1 — Team Page

What I build:
- `/team` page showing all team members across the user's projects
- Role hierarchy display: Super User → Project Admin → Client → Project Owner → Architect / MEP / Contractor
- "Invite Member" button: sends a Supabase invite email and adds them to `project_members`
- Remove member button (super_user only)
- Edit role button (super_user and project_admin)

Test checklist:
- Inviting a new member sends an email and shows them as "Pending" in the list
- After accepting the invite, the member appears as active
- A project_admin cannot invite a super_user
- Removing a member revokes their access immediately

---

## Phase 7 — Exports (Week 4-5)

### 7.1 — XLSX Tracker Export

What I build:
- `/api/projects/[id]/tracker` endpoint
- Generates an Excel file in CCIL tracker style
- Columns: Credit Code, Category, Title, Mandatory, Points Available, Points Achieved, Status, Documents Count, Remarks
- Uses `xlsx` library

Test checklist:
- Exported file opens in Excel without errors
- Data matches what is shown in the app
- File downloads correctly in Chrome and Edge

---

### 7.2 — PDF Summary Export

What I build:
- `/api/projects/[id]/summary` endpoint
- Generates a PDF with: Project details, score summary, credit breakdown by category, team members
- Uses `pdf-lib`

Test checklist:
- PDF downloads and opens correctly
- All project data is accurate
- Formatting is clean and readable

---

### 7.3 — ZIP Submission Pack

What I build:
- `/api/projects/[id]/submission-pack` endpoint
- Only available when all mandatory credits are achieved
- Collects all `approved` documents from Supabase Storage
- Packages them into a ZIP using `jszip`
- Includes the PDF summary and XLSX tracker in the ZIP

Test checklist:
- ZIP button is disabled when mandatory credits are incomplete
- ZIP contains only approved documents (not uploaded or rejected ones)
- ZIP downloads correctly and all files open cleanly
- PDF summary and XLSX tracker are included in the ZIP

---

### 7.4 — Submission View

What I build:
- `/projects/[id]/submission` page showing:
  - List of approved documents ready for submission
  - Score summary
  - Mandatory credit completion status
  - Download ZIP button

Test checklist:
- Page only shows approved documents
- Score summary is accurate
- ZIP export button is gated on mandatory credit completion

---

## Phase 8 — Polish & Production Readiness (Week 5)

### 8.1 — Guided Onboarding

What I build:
- `Start-Tracknov.bat` and `Start-Tracknov.ps1` launcher scripts
- Rename all "Harita" references in `package.json`, scripts, and metadata to "Tracknov"
- Interactive onboarding script that prompts for Supabase credentials, runs migrations, seeds catalog, and starts the app

Test checklist:
- A fresh Windows machine can run `Start-Tracknov.bat` and have the app running in under 10 minutes
- All "Harita" strings are removed from user-facing files

---

### 8.2 — Error Handling & Edge Cases

What I build:
- Global error boundary in Next.js (`error.tsx` at app root)
- Loading states on all data-fetching pages
- Empty state components for: no projects, no documents, no team members
- Friendly error messages instead of raw stack traces

Test checklist:
- Disconnecting from the internet mid-session shows a graceful error
- All pages have loading spinners while data fetches
- Empty states show helpful guidance text

---

### 8.3 — Security Audit

What I check:
- Every Supabase table has RLS enabled
- Service Role Key is never exposed in client-side code
- All API routes validate the user session before processing
- File upload validates file type (only PDF, PNG, JPG, DOCX allowed)
- No console.log statements expose sensitive data in production

---

### 8.4 — Deployment to Vercel

What I build:
- Connect GitHub repo to Vercel
- Set all environment variables in Vercel dashboard
- Run a production build locally first with `npm run build`
- Deploy and verify all pages work on the live URL

Test checklist:
- `npm run build` completes with zero errors
- Login, dashboard, projects, documents all work on the live Vercel URL
- Supabase storage file uploads work from the deployed app

---

## Test Matrix — Final Smoke Test Before Launch

| Feature | Test Action | Expected Result |
|---|---|---|
| Auth | Login with correct credentials | Redirected to dashboard |
| Auth | Login with wrong password | Error message shown |
| Auth | Access /dashboard without login | Redirected to /login |
| Projects | Create a new project | Appears in list immediately |
| Projects | Open project workspace | 47 credits loaded correctly |
| Credits | Change credit status to Achieved | Score updates on scoring page |
| Documents | Upload a PDF to a credit | Appears in documents list with "Pending" status |
| Documents | Project Owner approves | Status changes to "Owner Approved" |
| Documents | Project Admin approves | Status changes to "Validated" |
| Documents | Download a document | File opens correctly |
| Team | Invite a team member | Invite email received |
| Exports | Download XLSX tracker | File opens in Excel with correct data |
| Exports | Download PDF summary | PDF opens with correct project data |
| Exports | Download ZIP (all mandatory done) | ZIP contains all approved documents |
| Exports | Download ZIP (mandatory incomplete) | Button is disabled |

---

## Delivery Summary

| Phase | Feature | Timeline |
|---|---|---|
| 0 | Foundation + Database | Week 1 |
| 1 | Authentication | Week 1-2 |
| 2 | Dashboard | Week 2 |
| 3 | Projects | Week 2-3 |
| 4 | Credits & Scoring | Week 3 |
| 5 | Documents & Review | Week 3-4 |
| 6 | Team Management | Week 4 |
| 7 | Exports | Week 4-5 |
| 8 | Polish & Deployment | Week 5 |

**Total estimated timeline: 5 weeks from zero to production.**

## Updated Timeline Note (Merged)

With the newly merged scope (plans/billing, client view, consultant logger, resubmit loop, mobile optimization, and expanded QA), the active baseline should now be treated as a **7-week execution plan** with day-wise tracking.

---

## Added Features vs Original Baseline

- Pricing plans and credit consumption governance
- Usage analytics and burn tracking
- Consultant interaction credit logging
- Billing and invoicing
- Credit-level submission guidance and difficulty tags
- Resubmit workflow with review loop
- Audit trail hardening
- Jargon-free client mode
- Mobile optimization and final performance pass

---

*Built for Enov360 | IGBC Green Interiors Certification Platform*
