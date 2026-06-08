# Validation Entrypoint Coverage Audit

Updated: 2026-05-06 IST

## Scope

Required checkpoints from TODO:

- upload
- mapping
- assignment
- review
- approval / rejection / clarification
- submittal / credit / stage / project submission
- scoring / recompute
- overrides
- replacement
- resubmission

## Coverage status

| Entrypoint | Current mechanism | Status |
|---|---|---|
| Upload | `documentService.uploadDocument` + DB assignment guard trigger (`0051`) | Covered |
| Mapping | Credit/project linkage required in upload and project-upload API | Covered |
| Assignment | `creditService.assignCreditContributor` + DB uniqueness + role checks | Covered |
| Review | `reviewService` + role checks + state checks | Covered |
| Approve / Reject / Clarify | `document-state-service` transition checks + audit + rejection count | Covered |
| Submittal/Credit/Stage/Project submission | Derived-state recalculation triggers and summary recompute hooks | Covered |
| Scoring/recompute | DB-first scoring RPC (`get_project_certification_summary`) + route fallback | Covered |
| Overrides | Override pathways logged and constrained by role checks | Covered |
| Replacement | Versioning + no-overwrite guard on document URL | Covered |
| Resubmission | State machine supports `RESUBMITTED`; second rejection -> `ELIMINATED` | Covered |

## Residual risk

- Live DB migration application must be verified in each environment (local/staging/prod) to ensure trigger-based enforcement is active everywhere.
