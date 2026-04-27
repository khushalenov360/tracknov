# Tracknov TODO

This checklist is based on the current completion review against `tracknov-project-plan.md`.
Last updated: 2026-04-28

## Priority 1: Production blockers

- [ ] Run a full end-to-end live workflow test using real roles and real data:
  login -> dashboard -> create/open project -> upload document -> Project Owner review -> Project Admin review -> approved document appears in submission flow -> export tracker/PDF/ZIP.
- [x] Verify all current Supabase migrations are fully applied on the live project.
- [ ] Confirm document upload creates both:
  storage object in Supabase bucket and matching `documents` row in database.
- [ ] Confirm signed document links open correctly for uploaded files from the Documents tab.
- [ ] Verify project delete works only for `super_user`.
- [ ] Verify document delete is visible and works only for allowed roles.
- [ ] Verify role-based restrictions for document editing and status changes across:
  `super_user`, `project_admin`, `client`, `owner`, `architect`, `mep`, `contractor`.

## Priority 2: Plan gaps still incomplete

- [x] Reduce upload-size limit behavior to match plan requirement.
- [x] Change current frontend upload warning from `50 MB` to plan-aligned `10 MB`.
- [x] Add file-size handling strategy for large PDFs and image-heavy submissions.
- [x] Add graceful handling guidance for oversized uploads.
- [x] Add app-level `error.tsx` for friendly global error handling.
- [x] Add loading states where still missing across major data pages.
- [x] Review empty states on all major tabs and align them with the project plan.
- [x] Validate allowed upload file types against the plan and business needs.

## Priority 3: Identity and cleanup

- [x] Rename remaining legacy `Harita` references to `Tracknov`. (non-doc runtime surfaces now Tracknov-only)
- [x] Update `package.json` name, description, keywords, bin command, repository metadata, bugs URL, and homepage.
- [x] Rename launcher scripts from `Start-Harita.*` to `Start-Tracknov.*`.
- [x] Update onboarding scripts and README references to use `Tracknov` consistently.
- [x] Review internal labels, CLI text, and helper script copy for legacy naming.

## Priority 4: Security and hardening

- [x] Re-check that every Supabase table has RLS enabled in the live environment.
- [x] Re-check storage policies for private document access in the live environment.
- [x] Audit API routes to confirm session validation is enforced everywhere.
- [x] Confirm service-role usage is server-only and never exposed client-side.
- [x] Review production logs and code paths for sensitive debug output.

## Priority 5: Deployment readiness

- [x] Prepare final Vercel deployment configuration.
- [x] Verify all required environment variables are documented and present.
- [ ] Run a production smoke test on deployed URL:
  login, dashboard, projects, documents, uploads, exports.
- [ ] Confirm Supabase storage uploads work from deployed app, not only local.

## Priority 6: Functional refinement

- [ ] Review AI Copilot against live project database behavior on all tabs.
- [ ] Improve Copilot grounding so answers consistently reflect project-specific documents, credits, and status.
- [ ] Verify submission pack includes only approved documents.
- [ ] Verify mandatory-credit gating blocks submission export when incomplete.
- [ ] Review exports against expected CCIL / IGBC formatting and completeness.

## Priority 7: Documentation and project control

- [x] Keep `HANDOFF.md` updated with each push.
- [x] Use `tracknov-project-plan.md` as the baseline for milestone tracking.
- [x] Keep `BHAVARKUA_UPLOAD_MAP.md` available as ingestion reference for structured uploads.
- [x] Create a final release-readiness checklist once the above items are closed.

## Suggested execution order

1. Close live workflow verification.
2. Apply any missing Supabase migration/state fixes.
3. Complete remaining identity cleanup and UI empty-state alignment.
4. Complete Tracknov identity cleanup.
5. Run deployment smoke test.
6. Freeze release checklist and update handoff.

## Next immediate focus

1. Execute Priority 1 live verification with real role accounts and capture evidence.
2. Run deployment readiness checks and live smoke on hosted URL.
3. Close Priority 6 functional refinement checks for Copilot and exports.
