# Golden Flow

Last updated: 2026-06-20 IST

## Operational Golden Flow

1. User enters project workspace.
2. Queue-first dashboard surfaces:
   - My Priority Tasks
   - Mandatory Blockers
   - Pending Reviews
   - Clarifications
   - AI Guidance
3. Reviewer opens the three-pane validation workspace.
4. Review queue is grouped by submittal, not loose document cards.
5. Supporting evidence is inspected.
6. Human reviewer executes any approval or rejection through governed workflow actions.
7. Project admin triggers certification closure only after:
   - validated readiness
   - explicit comments
   - snapshot generation
8. System seals the project into `CERTIFIED_LOCKED`.
9. Final submission package is exported as a zip archive through the governed submission-pack route.

## Harita Golden Flow

1. User asks a conversational or analytical question.
2. Intent router classifies:
   - conversational
   - analytical
   - exploratory
   - operational
   - workflow
   - administrative
3. Harita answers directly, using live project tools in cloud mode or grounded fallback context in local mode.
4. Attachment handling remains split:
   - conversation analysis only by default
   - workflow upload only after explicit user action
5. Harita never approves, rejects, submits, or transitions workflow state.
